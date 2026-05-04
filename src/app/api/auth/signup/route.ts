import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getAdminClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getStandardClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function isEmailExistsError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || "").toLowerCase();
  return (
    message.includes("already") ||
    message.includes("exists") ||
    message.includes("registered") ||
    message.includes("duplicate")
  );
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey || !supabaseAnonKey || !siteUrl) {
    console.error("[signup] Missing required env vars");
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  let body: {
    email?: string;
    password?: string;
    inviteCode?: string;
    selectedCoachId?: string;
    firstName?: string;
    lastName?: string;
  };

  try {
    body = await request.json();
  } catch (error) {
    console.error("[signup] Invalid request JSON", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 400 }
    );
  }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const inviteCode = String(body.inviteCode || "").trim();
  const selectedCoachId = String(body.selectedCoachId || "").trim();
  const firstName = String(body.firstName || "").trim();
  const lastName = String(body.lastName || "").trim();

  if (!email || !password || !inviteCode || !selectedCoachId) {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 400 }
    );
  }

  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const admin = getAdminClient();
  const standardClient = getStandardClient();

  let createdUserId: string | null = null;
  let inviteConsumed = false;

  async function rollbackInviteConsume() {
    if (!inviteConsumed) return;

    try {
      const { error } = await admin.rpc("rollback_invite_code", { p_code: inviteCode });
      if (error) {
        console.error("[signup] rollback_invite_code failed", error);
      }
    } catch (error) {
      console.error("[signup] rollback_invite_code unexpected failure", error);
    }
  }

  async function rollbackDeleteAuthUser() {
    if (!createdUserId) return;
    try {
      // admin.auth.admin.deleteUser cascades (after clients FK migration is applied):
      // - auth.users -> profiles (ON DELETE CASCADE on profiles.id -> auth.users.id)
      // - profiles -> clients (ON DELETE CASCADE via clients_client_id_fkey / clients_coach_id_fkey)
      // So a single deleteUser() call cleans up profile + any clients rows referencing that profile.
      const { error } = await admin.auth.admin.deleteUser(createdUserId);
      if (error) {
        console.error("[signup] rollback deleteUser failed", error);
      }
    } catch (error) {
      console.error("[signup] rollback deleteUser unexpected failure", error);
    }
  }

  try {
    // Step 1: Pre-check invite validity without consuming it.
    const { data: invite, error: inviteCheckError } = await admin
      .from("invite_codes")
      .select("id, coach_id, is_active, expires_at, max_uses, used_count")
      .eq("code", inviteCode)
      .eq("coach_id", selectedCoachId)
      .eq("is_active", true)
      .single();

    if (inviteCheckError || !invite) {
      console.error("[signup] invite pre-check failed", inviteCheckError);
      return NextResponse.json(
        { error: "This invite code is invalid, expired, or doesn't match the selected coach." },
        { status: 400 }
      );
    }

    if (invite.expires_at && new Date(invite.expires_at) <= new Date()) {
      return NextResponse.json(
        { error: "This invite code has expired." },
        { status: 400 }
      );
    }

    if (invite.max_uses !== null && invite.used_count >= invite.max_uses) {
      return NextResponse.json(
        { error: "This invite code has reached its usage limit." },
        { status: 400 }
      );
    }

    // Step 2: Standard signup with anon key so Supabase sends confirmation email.
    const { data: signUpData, error: signUpError } = await standardClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: "client",
        },
        emailRedirectTo: `${siteUrl}/`,
      },
    });

    if (signUpError) {
      console.error("[signup] standard signUp failed", signUpError);
      if (isEmailExistsError(signUpError)) {
        return NextResponse.json(
          { error: "An account with this email already exists. Try logging in instead." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 400 }
      );
    }

    createdUserId = signUpData.user?.id ?? null;
    if (!createdUserId) {
      console.error("[signup] signUp succeeded but no user id returned");
      return NextResponse.json(
        { error: "Signup failed unexpectedly." },
        { status: 500 }
      );
    }

    // Step 3: Atomic invite consumption for race-safe usage counting.
    // NOTE: There's a small race window between auth user creation (step 2)
    // and invite consumption (step 3). Two simultaneous signups with the same
    // single-use invite can both pass step 2; the slower one fails at step 3
    // and rolls back. The slower user receives a confirmation email that, when
    // clicked, leads to a deleted account. This is acceptable: rare race +
    // recoverable failure mode (user sees invite-invalid error if they try again).
    const { error: consumeError } = await admin.rpc("consume_invite_code", {
      p_code: inviteCode,
      p_coach_id: selectedCoachId,
    });

    if (consumeError) {
      console.error("[signup] consume_invite_code failed", consumeError);
      await rollbackDeleteAuthUser();
      return NextResponse.json(
        { error: "This invite code is invalid, expired, or has already been used." },
        { status: 400 }
      );
    }
    inviteConsumed = true;

    // Step 4: Create coach-client pairing row (clients.id is generated; auth user id is client_id only).
    const { error: clientInsertError } = await admin.from("clients").insert({
      coach_id: selectedCoachId,
      client_id: createdUserId,
      status: "active",
    });

    if (clientInsertError) {
      // No clients row exists when insert fails — no manual clients delete needed.
      // Roll back: restore invite usage, then delete auth user (cascades profile + clients after FK migration).
      console.error("[signup] clients insert failed", clientInsertError);
      await rollbackInviteConsume();
      await rollbackDeleteAuthUser();
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    // Step 5: Success.
    return NextResponse.json({
      success: true,
      message:
        "Almost done! We sent a confirmation link to your email. Click it to activate your account, then log in.",
    });
  } catch (error) {
    console.error("[signup] Unexpected error", error);
    await rollbackInviteConsume();
    await rollbackDeleteAuthUser();

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
