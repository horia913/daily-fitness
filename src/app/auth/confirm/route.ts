import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getTrackedFetch } from "@/lib/supabaseQueryLogger";

type ConfirmType = "recovery" | "email";

const ALLOWED_TYPES = new Set<ConfirmType>(["recovery", "email"]);

/**
 * Allow only same-origin relative paths (block open redirects).
 * Rejects protocol-relative URLs, absolute URLs, and backslash tricks.
 */
function safeRelativeNext(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return fallback;
  }
  try {
    const decoded = decodeURIComponent(trimmed);
    if (!decoded.startsWith("/") || decoded.startsWith("//")) {
      return fallback;
    }
  } catch {
    return fallback;
  }
  return trimmed.split("?")[0] || fallback;
}

function defaultsForType(type: ConfirmType): {
  defaultNext: string;
  invalidPath: string;
} {
  if (type === "recovery") {
    return {
      defaultNext: "/reset-password",
      invalidPath: "/reset-password?error=invalid_link",
    };
  }
  // type === "email" (signup confirmation)
  return {
    defaultNext: "/",
    invalidPath: "/?error=confirm_invalid",
  };
}

/**
 * GET /auth/confirm
 * Token-hash callback: verifyOtp → set session cookies → redirect.
 * - recovery → password reset (next defaults to /reset-password)
 * - email → signup confirmation (next defaults to /)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash")?.trim() || null;
  const typeRaw = searchParams.get("type")?.trim() || null;

  if (!token_hash || !typeRaw || !ALLOWED_TYPES.has(typeRaw as ConfirmType)) {
    // Unknown/missing type: cannot choose a sensible page — send to login with confirm error
    return NextResponse.redirect(new URL("/?error=confirm_invalid", origin));
  }

  const type = typeRaw as ConfirmType;
  const { defaultNext, invalidPath } = defaultsForType(type);
  const nextPath = safeRelativeNext(searchParams.get("next"), defaultNext);

  const redirectInvalid = () =>
    NextResponse.redirect(new URL(invalidPath, origin));

  // Build redirect first so verifyOtp can attach session cookies to THIS response.
  const successRedirect = NextResponse.redirect(new URL(nextPath, origin));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[auth/confirm] Missing Supabase env");
    return redirectInvalid();
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          successRedirect.cookies.set(name, value, options);
        });
      },
    },
    global: {
      fetch: getTrackedFetch(),
    },
  });

  const { error } = await supabase.auth.verifyOtp({
    type: type as EmailOtpType,
    token_hash,
  });

  if (error) {
    console.warn("[auth/confirm] verifyOtp failed:", {
      type,
      message: error.message,
    });
    return redirectInvalid();
  }

  return successRedirect;
}
