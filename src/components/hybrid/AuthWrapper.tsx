"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { isCoachRole } from "@/lib/roleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AuthLayout,
  AuthFormContainer,
} from "@/components/server/AuthLayout";
import {
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  Users,
  Gift,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Shield,
  Key,
} from "lucide-react";

export function AuthWrapper() {
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedCoachId, setSelectedCoachId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [coaches, setCoaches] = useState<
    Array<{
      id: string;
      first_name?: string;
      last_name?: string;
      // email removed for security - not exposed in coaches_public table
    }>
  >([]);
  const [explicitSubmit, setExplicitSubmit] = useState(false);
  const [hasInviteInUrl, setHasInviteInUrl] = useState(false);
  const [forgotCooldownSeconds, setForgotCooldownSeconds] = useState(0);
  const [profileLoadRetryUserId, setProfileLoadRetryUserId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const isLogin = authMode === "login";
  const isSignup = authMode === "signup";
  const isForgot = authMode === "forgot";

  // Password strength checker
  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { score: 0, label: "", color: "" };
    if (password.length < 6)
      return { score: 1, label: "Weak", color: "fc-text-error" };
    if (password.length < 8)
      return { score: 2, label: "Fair", color: "fc-text-warning" };
    if (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password)
    ) {
      return { score: 3, label: "Strong", color: "fc-text-success" };
    }
    return { score: 2, label: "Good", color: "fc-text-warning" };
  };

  const passwordStrength = getPasswordStrength(password);

  useEffect(() => {
    if (forgotCooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setForgotCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotCooldownSeconds]);

  // Fetch coaches for dropdown from public-safe coaches_public table
  // This table only exposes first_name, last_name (no PII like email)
  const fetchCoaches = async () => {
    try {
      const { data, error } = await supabase
        .from("coaches_public")
        .select("coach_id, first_name, last_name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("last_name", { ascending: true });

      if (error) {
        console.error("Error fetching coaches:", error);
        console.error("Error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        if (error.code === '42P01') {
          console.error("Table coaches_public doesn't exist. Run migration 20260128_create_coaches_public.sql");
        }
        return;
      }

      // Map coach_id to id so existing UI code works unchanged
      const mappedData = (data || []).map(coach => ({
        id: coach.coach_id,
        first_name: coach.first_name,
        last_name: coach.last_name,
      }));

      setCoaches(mappedData);
      if (!mappedData || mappedData.length === 0) {
        console.warn("No coaches found. Run 20260128_seed_coaches_public.sql to populate.");
      }
    } catch (error) {
      console.error("Error fetching coaches:", error);
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    const redirectWithProfile = async () => {
      const resolvedProfile = profile || (await refreshProfile());
      const redirectPath = resolvedProfile && isCoachRole(resolvedProfile.role)
        ? "/coach"
        : "/client";
      router.push(redirectPath);
    };

    redirectWithProfile();
  }, [user, profile, authLoading, refreshProfile, router]);

  // Fetch coaches when component mounts (also when not logged in, so signup dropdown can show)
  useEffect(() => {
    fetchCoaches();
  }, []);

  // Handle URL parameters for invite links
  useEffect(() => {
    // Read from both searchParams (Next.js) and window.location (fallback)
    let inviteParam: string | null = null;
    let emailParam: string | null = null;

    if (searchParams) {
      inviteParam = searchParams.get("invite");
      emailParam = searchParams.get("email");
    }

    // Fallback: read directly from URL if searchParams didn't work
    if (typeof window !== 'undefined' && (!inviteParam || !emailParam)) {
      const urlParams = new URLSearchParams(window.location.search);
      inviteParam = inviteParam || urlParams.get("invite");
      emailParam = emailParam || urlParams.get("email");
    }

    if (inviteParam) {
      const trimmedCode = inviteParam.trim();
      setInviteCode(trimmedCode);
      setAuthMode("signup"); // Switch to signup mode
      setHasInviteInUrl(true); // Hide Sign In / Sign Up tabs for invite-only flow
    }

    if (emailParam) {
      try {
        // Decode the email in case it's URL encoded
        const decodedEmail = decodeURIComponent(emailParam).trim();
        setEmail(decodedEmail);
      } catch (error) {
        // If decoding fails, use the original
        const trimmedEmail = emailParam.trim();
        setEmail(trimmedEmail);
      }
    }
  }, [searchParams]);

  // Prevent form submission on Enter key press in input fields
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
      // Only allow Enter to submit if user explicitly wants to (e.g., after clicking submit button)
      // This prevents accidental auto-submission while typing
      if (loading) {
        e.preventDefault();
        return;
      }
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent submission if already loading
    if (loading) return;

    // Only proceed if this is an explicit submit (button click)
    if (!explicitSubmit) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (isForgot) {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) {
          throw new Error("Please enter your email address.");
        }
        if (forgotCooldownSeconds > 0) {
          throw new Error(`Please wait ${forgotCooldownSeconds}s before trying again.`);
        }
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        // Always return a generic message to avoid account enumeration.
        setSuccess("If that email is registered, check your inbox for a password reset link.");
        setForgotCooldownSeconds(30);
      } else if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          const rawMessage = String(error.message || "").toLowerCase();
          let friendlyMessage: string;

          if (rawMessage.includes("invalid login credentials") || rawMessage.includes("invalid_credentials")) {
            friendlyMessage = "Wrong email or password. Please try again.";
          } else if (rawMessage.includes("email not confirmed")) {
            friendlyMessage = "Please confirm your email before logging in. Check your inbox for the confirmation link.";
          } else if (rawMessage.includes("too many requests") || rawMessage.includes("rate limit")) {
            friendlyMessage = "Too many login attempts. Please wait a few minutes and try again.";
          } else if (rawMessage.includes("network") || rawMessage.includes("fetch")) {
            friendlyMessage = "Network error. Please check your connection and try again.";
          } else {
            friendlyMessage = "Login failed. Please try again.";
          }

          throw new Error(friendlyMessage);
        }

        if (data.user) {
          setProfileLoadRetryUserId(null);
          setSuccess("Login successful! Redirecting...");
          // Get user profile to determine role-based redirect
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single();

          if (profileError || !profile) {
            setSuccess("");
            setProfileLoadRetryUserId(data.user.id);
            throw new Error("We couldn't load your profile. Please try again.");
          }

          const redirectPath =
            isCoachRole(profile.role)
              ? "/coach"
              : "/client";
          setTimeout(() => router.push(redirectPath), 1500);
        }
      } else {
        // Validate coach selection for new signups
        if (!selectedCoachId) {
          throw new Error("Please select a coach");
        }

        // Validate invite code for new signups
        if (!inviteCode.trim()) {
          throw new Error("Invite code is required to create an account");
        }

        // Validate password strength
        if (passwordStrength.score < 2) {
          throw new Error(
            "Password is too weak. Please use at least 8 characters with numbers and uppercase letters."
          );
        }

        const signupResponse = await fetch("/api/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
            inviteCode: inviteCode.trim(),
            selectedCoachId,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
          }),
        });

        const signupResult = await signupResponse.json().catch(() => ({}));
        if (!signupResponse.ok) {
          throw new Error(signupResult?.error || "Something went wrong. Please try again.");
        }

        setSuccess(
          `Almost done! We sent a confirmation link to ${email.trim().toLowerCase()}. Click it to activate your account, then log in.`
        );

        setPassword("");
        setFirstName("");
        setLastName("");
        setInviteCode("");
        setSelectedCoachId("");
        setAcceptedTerms(false);
        setAuthMode("login");
      }
    } catch (err: any) {
      if (isForgot) {
        const message = String(err?.message || "").toLowerCase();
        if (message.includes("too many") || message.includes("429")) {
          setForgotCooldownSeconds(60);
          setError("Too many reset attempts. Please wait 60 seconds and try again.");
        } else if (message.includes("please wait")) {
          setError(err.message);
        } else {
          setError("Could not send reset email. Please try again.");
        }
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
      setExplicitSubmit(false); // Reset the explicit submit flag
    }
  };

  return (
    <AuthLayout>
      <AuthFormContainer
        title={
          isForgot
            ? "Reset your password"
            : hasInviteInUrl
              ? "Create your account"
              : isLogin
                ? "Sign in"
                : "Create account"
        }
        description={
          isForgot
            ? "Enter your email and we will send you a secure reset link"
            : hasInviteInUrl
            ? "Use the details from your invite link to get started"
            : isLogin
              ? "Access your coach-assigned workouts and programs"
              : "Use your invite code to join your coach on DailyFitness"
        }
      >
        {/* Segmented Control - hidden when client arrives via invite link (sign-up only) */}
        {!hasInviteInUrl && !isForgot && (
          <div className="mb-8">
            <div className="fc-glass-soft rounded-2xl p-1 flex border border-[color:var(--fc-glass-border)]">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setError("");
                  setExplicitSubmit(false);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                  isLogin
                    ? "fc-glass-base border border-[color:var(--fc-glass-border)] shadow-sm fc-text-primary"
                    : "fc-text-dim hover:fc-text-primary"
                }`}
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signup");
                  setError("");
                  setExplicitSubmit(false);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                  isSignup
                    ? "fc-glass-base border border-[color:var(--fc-glass-border)] shadow-sm fc-text-primary"
                    : "fc-text-dim hover:fc-text-primary"
                }`}
              >
                <UserPlus className="w-4 h-4" />
                Sign Up
              </button>
            </div>
          </div>
        )}

        <form
          onSubmit={handleAuth}
          onKeyDown={handleKeyDown}
          className="space-y-6"
        >
          {/* Error Message (Design System v2) */}
          {error && (
            <div className="fc-glass-soft border border-[color:var(--fc-status-error)] fc-text-error px-4 py-3 rounded-2xl text-sm flex items-center gap-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "color-mix(in srgb, var(--fc-status-error) 25%, transparent)" }}>
                <AlertCircle className="w-3 h-3" />
              </div>
              {error}
            </div>
          )}

          {/* Success Message (Design System v2) */}
          {success && (
            <div className="fc-glass-soft border border-[color:var(--fc-status-success)] fc-text-success px-4 py-3 rounded-2xl text-sm flex items-center gap-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "color-mix(in srgb, var(--fc-status-success) 25%, transparent)" }}>
                <CheckCircle className="w-3 h-3" />
              </div>
              {success}
            </div>
          )}

          {isSignup && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="firstName"
                    className="text-sm font-medium fc-text-primary"
                  >
                    First Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 fc-text-dim" />
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required={isSignup}
                      variant="fc"
                      className="pl-10 h-12 rounded-xl"
                      placeholder="John"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="lastName"
                    className="text-sm font-medium fc-text-primary"
                  >
                    Last Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 fc-text-dim" />
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required={isSignup}
                      variant="fc"
                      className="pl-10 h-12 rounded-xl"
                      placeholder="Doe"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="coach"
                  className="text-sm font-medium fc-text-primary"
                >
                  Select Your Coach
                </Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 fc-text-dim z-10" />
                  <Select
                    value={selectedCoachId}
                    onValueChange={setSelectedCoachId}
                  >
                    <SelectTrigger className="pl-10 h-12 rounded-xl border-[color:var(--fc-glass-border)] bg-[var(--fc-glass-soft)] focus:border-[var(--fc-accent-cyan)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--fc-accent-cyan)_20%,transparent)]">
                      <SelectValue placeholder="Choose your fitness coach" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[color:var(--fc-glass-border)] bg-[var(--fc-glass-base)]">
                      {coaches.map((coach) => (
                        <SelectItem
                          key={coach.id}
                          value={coach.id}
                          className="rounded-xl"
                        >
                          {coach.first_name || coach.last_name
                            ? `${coach.first_name || ''} ${coach.last_name || ''}`.trim()
                            : 'Coach'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {coaches.length === 0 && (
                  <p className="text-xs fc-text-dim mt-1 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    No coaches available. Please contact support.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="inviteCode"
                  className="text-sm font-medium fc-text-primary"
                >
                  Invite Code
                </Label>
                <div className="relative">
                  <Gift className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 fc-text-dim" />
                  <Input
                    id="inviteCode"
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Enter your invite code"
                    required={isSignup}
                    variant="fc"
                    className="pl-10 h-12 rounded-xl"
                  />
                </div>
                <p className="text-xs fc-text-dim mt-1">
                  Ask your coach or contact support for an invite code
                </p>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-sm font-medium fc-text-primary"
            >
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 fc-text-dim" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                variant="fc"
                className="pl-10 h-12 rounded-xl"
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-sm font-medium fc-text-primary"
            >
              {isForgot ? "Current password not required" : "Password"}
            </Label>
            {!isForgot ? (
              <>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 fc-text-dim" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!isForgot}
                    minLength={6}
                    variant="fc"
                    className="pl-10 pr-12 h-12 rounded-xl"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 fc-text-dim hover:fc-text-primary transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {isSignup && password && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="fc-text-dim">Password strength:</span>
                      <span className={`font-medium ${passwordStrength.color}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="w-full rounded-full h-2 fc-progress-track">
                      <div
                        className="h-2 rounded-full transition-all duration-300 fc-progress-fill"
                        style={{
                          width:
                            passwordStrength.score === 1
                              ? "33%"
                              : passwordStrength.score === 2
                              ? "66%"
                              : passwordStrength.score === 3
                              ? "100%"
                              : "0",
                          background:
                            passwordStrength.score === 1
                              ? "var(--fc-status-error)"
                              : passwordStrength.score === 2
                              ? "var(--fc-status-warning)"
                              : "var(--fc-status-success)",
                        }}
                      ></div>
                    </div>
                    <div className="text-xs fc-text-dim space-y-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            background:
                              password.length >= 6
                                ? "var(--fc-status-success)"
                                : "var(--fc-glass-border)",
                          }}
                        ></div>
                        <span>At least 6 characters</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            background:
                              password.length >= 8
                                ? "var(--fc-status-success)"
                                : "var(--fc-glass-border)",
                          }}
                        ></div>
                        <span>At least 8 characters (recommended)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            background:
                              /[A-Z]/.test(password) && /[0-9]/.test(password)
                                ? "var(--fc-status-success)"
                                : "var(--fc-glass-border)",
                          }}
                        ></div>
                        <span>Numbers and uppercase letters</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs fc-text-dim">
                Enter your email address above and we will send you a secure reset link.
              </p>
            )}
          </div>


          <Button
            type="submit"
            variant="fc-primary"
            className="w-full h-12 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            disabled={loading || (isForgot && forgotCooldownSeconds > 0)}
            onClick={() => setExplicitSubmit(true)}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70"></div>
                {isForgot ? "Sending reset link..." : isLogin ? "Signing In..." : "Creating Account..."}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {isForgot ? (
                  <Key className="w-4 h-4" />
                ) : isLogin ? (
                  <LogIn className="w-4 h-4" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {isForgot
                  ? forgotCooldownSeconds > 0
                    ? `Try again in ${forgotCooldownSeconds}s`
                    : "Send reset link"
                  : isLogin
                    ? "Sign In"
                    : "Create Account"}
              </div>
            )}
          </Button>
          {isLogin && profileLoadRetryUserId && (
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl font-semibold"
              disabled={loading}
              onClick={async () => {
                if (loading) return;
                setLoading(true);
                setError("");
                setSuccess("");
                try {
                  const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", profileLoadRetryUserId)
                    .single();

                  if (profileError || !profile) {
                    throw new Error("We couldn't load your profile. Please try again.");
                  }

                  const redirectPath = isCoachRole(profile.role) ? "/coach" : "/client";
                  setProfileLoadRetryUserId(null);
                  setSuccess("Login successful! Redirecting...");
                  setTimeout(() => router.push(redirectPath), 300);
                } catch (retryError: any) {
                  setError(retryError?.message || "We couldn't load your profile. Please try again.");
                } finally {
                  setLoading(false);
                }
              }}
            >
              Retry profile load
            </Button>
          )}
        </form>

        {/* Forgot Password Link */}
        {isLogin && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setAuthMode("forgot");
                setError("");
                setSuccess("");
                setExplicitSubmit(false);
              }}
              className="fc-text-dim hover:fc-text-primary text-sm font-medium transition-colors"
            >
              Forgot your password?
            </button>
          </div>
        )}

        {isForgot && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setError("");
                setSuccess("");
                setExplicitSubmit(false);
              }}
              className="fc-text-dim hover:fc-text-primary text-sm font-medium transition-colors"
            >
              Back to login
            </button>
          </div>
        )}

        {/* Fix login - clear cached session when stuck */}
        {isLogin && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={async () => {
                try {
                  await supabase.auth.signOut();
                  if (typeof localStorage !== "undefined") localStorage.clear();
                  if (typeof sessionStorage !== "undefined") sessionStorage.clear();
              } finally {
                  window.location.reload();
                }
              }}
              className="fc-text-dim hover:fc-text-primary text-xs font-medium transition-colors"
            >
              Having trouble signing in? Clear session and retry
            </button>
          </div>
        )}

        {/* Security Assurance */}
        <div className="mt-6 pt-6 border-t border-[color:var(--fc-glass-border)]">
          <div className="flex items-center justify-center gap-2 text-sm fc-text-dim">
            <Shield className="w-4 h-4 fc-text-success" />
            <span>Your account and data are kept secure</span>
          </div>
        </div>

      </AuthFormContainer>
    </AuthLayout>
  );
}
