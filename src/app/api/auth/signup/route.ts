import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isCoachRole } from "@/lib/roleGuard";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getAdminClient() {
  return createClient(supabaseUrl!, serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getStandardClient() {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function resolveSiteUrl(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  const origin = request.headers.get("origin")?.trim();
  if (origin) return origin.replace(/\/$/, "");

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`.replace(/\/$/, "");

  return "http://localhost:3000";
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

function isMissingRpcError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || "").toLowerCase();
  const code = String((error as { code?: string })?.code || "");
  return (
    code === "PGRST202" ||
    message.includes("could not find the function") ||
    message.includes("consume_invite_code")
  );
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey || !supabaseAnonKey) {
    console.error("[signup] Missing required env vars", {
      hasUrl: Boolean(supabaseUrl),
      hasAnon: Boolean(supabaseAnonKey),
      hasServiceRole: Boolean(serviceRoleKey),
    });
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  const siteUrl = resolveSiteUrl(request);

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
      const { error } = await admin.auth.admin.deleteUser(createdUserId);
      if (error) {
        console.error("[signup] rollback deleteUser failed", error);
      }
    } catch (error) {
      console.error("[signup] rollback deleteUser unexpected failure", error);
    }
  }

  async function ensureClientProfile(userId: string): Promise<boolean> {
    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: userId,
        email,
        role: "client",
        first_name: firstName || null,
        last_name: lastName || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.error("[signup] profile upsert failed", profileError);
      return false;
    }

    return true;
  }

  try {
    const { data: coachProfile, error: coachCheckError } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", selectedCoachId)
      .maybeSingle();

    if (coachCheckError || !coachProfile || !isCoachRole(coachProfile.role)) {
      console.error("[signup] coach pre-check failed", coachCheckError, coachProfile);
      return NextResponse.json(
        { error: "Please select a valid coach." },
        { status: 400 }
      );
    }

    // Look up by code + coach first (include inactive/expired so we can return specific errors)
    const { data: invite, error: inviteCheckError } = await admin
      .from("invite_codes")
      .select("id, coach_id, is_active, expires_at, max_uses, used_count")
      .eq("code", inviteCode)
      .eq("coach_id", selectedCoachId)
      .maybeSingle();

    if (inviteCheckError) {
      console.error("[signup] invite pre-check failed", inviteCheckError);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    if (!invite) {
      return NextResponse.json(
        {
          error:
            "This invite code is invalid or doesn't match the selected coach.",
        },
        { status: 400 }
      );
    }

    if (invite.is_active === false) {
      return NextResponse.json(
        { error: "This invite code is no longer active." },
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

    const profileReady = await ensureClientProfile(createdUserId);
    if (!profileReady) {
      await rollbackDeleteAuthUser();
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    const { error: consumeError } = await admin.rpc("consume_invite_code", {
      p_code: inviteCode,
      p_coach_id: selectedCoachId,
    });

    if (consumeError) {
      console.error("[signup] consume_invite_code failed", consumeError);
      await rollbackDeleteAuthUser();
      if (isMissingRpcError(consumeError)) {
        return NextResponse.json(
          { error: "Signup is temporarily unavailable. Please contact support." },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: "This invite code is invalid, expired, or has already been used." },
        { status: 400 }
      );
    }
    inviteConsumed = true;

    const { error: clientInsertError } = await admin.from("clients").insert({
      coach_id: selectedCoachId,
      client_id: createdUserId,
      status: "active",
    });

    if (clientInsertError) {
      console.error("[signup] clients insert failed", {
        message: clientInsertError.message,
        code: clientInsertError.code,
        details: clientInsertError.details,
        hint: clientInsertError.hint,
      });
      await rollbackInviteConsume();
      await rollbackDeleteAuthUser();
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    try {
      const { notifyCoachNewClient } = await import("@/lib/inAppNotificationEvents");
      notifyCoachNewClient({
        coachId: selectedCoachId,
        clientId: createdUserId,
        clientName: firstName || undefined,
        admin,
      });
    } catch {
      /* non-blocking */
    }

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
