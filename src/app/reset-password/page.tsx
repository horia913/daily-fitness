"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AuthLayout,
  AuthFormContainer,
  FeatureHighlights,
} from "@/components/server/AuthLayout";
import { AlertCircle, CheckCircle, Eye, EyeOff, KeyRound, Shield } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<
    "verifying" | "ready" | "invalid" | "submitting" | "success" | "error"
  >("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const recoveryEventSeenRef = useRef(false);
  const invalidTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startRecoveryVerification = useCallback(() => {
    recoveryEventSeenRef.current = false;
    setErrorMessage("");
    setStatus("verifying");

    if (invalidTimeoutRef.current) {
      clearTimeout(invalidTimeoutRef.current);
    }

    invalidTimeoutRef.current = setTimeout(() => {
      if (!recoveryEventSeenRef.current) {
        console.warn("[reset-password] Recovery event not received within timeout");
        setStatus("invalid");
        setErrorMessage("This reset link is invalid or expired. Request a new one.");
      }
    }, 5000);
  }, []);

  useEffect(() => {
    // This page relies on detectSessionInUrl: true (default) in the supabase browser client.
    // Supabase auto-detects the ?code=xxx query param and exchanges it for a recovery session,
    // which triggers a PASSWORD_RECOVERY auth state event. Do NOT call exchangeCodeForSession
    // manually here — that creates a duplicate-exchange race.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[reset-password] auth state event", { event, hasSession: Boolean(session) });
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        recoveryEventSeenRef.current = true;
        if (invalidTimeoutRef.current) {
          clearTimeout(invalidTimeoutRef.current);
          invalidTimeoutRef.current = null;
        }
        setErrorMessage("");
        setStatus("ready");
      }
    });

    startRecoveryVerification();

    return () => {
      if (invalidTimeoutRef.current) {
        clearTimeout(invalidTimeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, [startRecoveryVerification]);

  const handleUpdatePassword = async () => {
    if (status === "submitting") return;

    setErrorMessage("");

    if (status !== "ready" && status !== "error") {
      setStatus("invalid");
      setErrorMessage("This reset link is invalid or expired. Request a new one.");
      return;
    }

    if (newPassword.length < 8) {
      setStatus("error");
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus("error");
      setErrorMessage("Passwords do not match.");
      return;
    }

    setStatus("submitting");
    try {
      console.log("[reset-password] Calling supabase.auth.updateUser()");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        console.error("[reset-password] supabase.auth.updateUser failed", error);
        const msg = String(error.message || "").toLowerCase();
        if (
          msg.includes("invalid") ||
          msg.includes("expired") ||
          msg.includes("token") ||
          msg.includes("session")
        ) {
          setStatus("invalid");
          setErrorMessage("Session expired. Request a new reset link.");
          return;
        }
        setStatus("error");
        setErrorMessage(error.message || "Could not update password. Please try again.");
        return;
      }

      console.log("[reset-password] Password updated successfully");
      setStatus("success");
      setTimeout(() => router.push("/"), 1200);
    } catch (updateError: any) {
      console.error("Password update failed:", updateError);
      setStatus("error");
      if (updateError?.name === "AbortError") {
        setErrorMessage("Network error. Please try again.");
      } else {
        setErrorMessage(updateError?.message || "Could not update password. Please try again.");
      }
    }
  };

  return (
    <AuthLayout>
      <AuthFormContainer
        title="Set new password"
        description="Choose a new secure password for your account"
      >
        {status === "verifying" ? (
          <div className="space-y-4">
            <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] px-4 py-4 rounded-2xl text-sm flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70" />
              Verifying your reset link...
            </div>
          </div>
        ) : status === "invalid" ? (
          <div className="space-y-4">
            <div className="fc-glass-soft border border-[color:var(--fc-status-error)] fc-text-error px-4 py-3 rounded-2xl text-sm flex items-start gap-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "color-mix(in srgb, var(--fc-status-error) 25%, transparent)" }}>
                <AlertCircle className="w-3 h-3" />
              </div>
              <div>
                <p>This reset link is invalid or expired. Request a new one.</p>
                {errorMessage ? <p className="mt-1">{errorMessage}</p> : null}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                type="button"
                variant="fc-primary"
                className="w-full h-12 rounded-xl font-semibold"
                onClick={startRecoveryVerification}
              >
                Retry verification
              </Button>
              <Link
                href="/"
                className="text-center fc-text-dim hover:fc-text-primary text-sm font-medium transition-colors"
              >
                Back to login
              </Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleUpdatePassword();
            }}
            noValidate
            className="space-y-6"
          >
            {status === "error" && errorMessage && (
              <div className="fc-glass-soft border border-[color:var(--fc-status-error)] fc-text-error px-4 py-3 rounded-2xl text-sm flex items-center gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "color-mix(in srgb, var(--fc-status-error) 25%, transparent)" }}>
                  <AlertCircle className="w-3 h-3" />
                </div>
                {errorMessage}
              </div>
            )}

            {status === "success" && (
              <div className="fc-glass-soft border border-[color:var(--fc-status-success)] fc-text-success px-4 py-3 rounded-2xl text-sm flex items-center gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "color-mix(in srgb, var(--fc-status-success) 25%, transparent)" }}>
                  <CheckCircle className="w-3 h-3" />
                </div>
                Password updated successfully. Redirecting to sign in...
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium fc-text-primary">
                New Password
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 fc-text-dim" />
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={status === "submitting" || status === "success"}
                  variant="fc"
                  className="pl-10 pr-12 h-12 rounded-xl"
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={status === "submitting" || status === "success"}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 fc-text-dim hover:fc-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs fc-text-dim">Use at least 8 characters.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium fc-text-primary">
                Confirm New Password
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 fc-text-dim" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={status === "submitting" || status === "success"}
                  variant="fc"
                  className="pl-10 pr-12 h-12 rounded-xl"
                  placeholder="Re-enter your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  disabled={status === "submitting" || status === "success"}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 fc-text-dim hover:fc-text-primary transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="button"
              variant="fc-primary"
              className="w-full h-12 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              disabled={status === "submitting" || status === "success"}
              onClick={() => {
                console.log("[reset-password] Update button clicked", { status });
                void handleUpdatePassword();
              }}
            >
              {status === "submitting" ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70"></div>
                  Updating password...
                </div>
              ) : (
                "Update password"
              )}
            </Button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-[color:var(--fc-glass-border)]">
          <div className="flex items-center justify-center gap-2 text-sm fc-text-dim">
            <Shield className="w-4 h-4 fc-text-success" />
            <span>Your data is protected with enterprise-grade security</span>
          </div>
        </div>

        <FeatureHighlights />
      </AuthFormContainer>
    </AuthLayout>
  );
}
