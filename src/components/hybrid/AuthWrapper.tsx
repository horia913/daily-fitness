"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { COACH_ROLES, isCoachRole } from "@/lib/roleGuard";
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
  FeatureHighlights,
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
  const [isLogin, setIsLogin] = useState(true);
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();

  // Password strength checker
  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { score: 0, label: "", color: "" };
    if (password.length < 6)
      return { score: 1, label: "Weak", color: "text-red-500" };
    if (password.length < 8)
      return { score: 2, label: "Fair", color: "text-orange-500" };
    if (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password)
    ) {
      return { score: 3, label: "Strong", color: "text-green-500" };
    }
    return { score: 2, label: "Good", color: "text-yellow-500" };
  };

  const passwordStrength = getPasswordStrength(password);

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

    console.log('🔍 URL params check:', { inviteParam, emailParam, searchParamsAvailable: !!searchParams });

    if (inviteParam) {
      const trimmedCode = inviteParam.trim();
      setInviteCode(trimmedCode);
      setIsLogin(false); // Switch to signup mode
      console.log('✅ Invite code set from URL:', trimmedCode);
    }

    if (emailParam) {
      try {
        // Decode the email in case it's URL encoded
        const decodedEmail = decodeURIComponent(emailParam).trim();
        setEmail(decodedEmail);
        console.log('✅ Email set from URL:', decodedEmail);
      } catch (error) {
        // If decoding fails, use the original
        const trimmedEmail = emailParam.trim();
        setEmail(trimmedEmail);
        console.log('✅ Email set from URL (no decode needed):', trimmedEmail);
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
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        if (data.user) {
          setSuccess("Login successful! Redirecting...");
          // Get user profile to determine role-based redirect
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single();

          const redirectPath =
            profile && isCoachRole(profile.role)
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

        // Check if invite code is valid
        try {
          const { data: inviteData, error: inviteError } = await supabase
            .from("invite_codes")
            .select("*")
            .eq("code", inviteCode.trim())
            .eq("is_active", true)
            .single();

          if (inviteError || !inviteData) {
            throw new Error("Invalid or expired invite code");
          }

          // Check if invite code has remaining uses
          if (
            inviteData.max_uses &&
            inviteData.used_count >= inviteData.max_uses
          ) {
            throw new Error("This invite code has reached its usage limit");
          }
        } catch (inviteCheckError) {
          throw new Error("Invalid or expired invite code");
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: "client", // All new accounts are clients
              first_name: firstName,
              last_name: lastName,
              invite_code: inviteCode.trim(),
              coach_id: selectedCoachId,
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          // Update invite code usage
          // Fetch current used_count first
          const { data: inviteData } = await supabase
            .from("invite_codes")
            .select("used_count")
            .eq("code", inviteCode.trim())
            .single();
          
          await supabase
            .from("invite_codes")
            .update({
              used_count: (inviteData?.used_count || 0) + 1,
              last_used_at: new Date().toISOString(),
            })
            .eq("code", inviteCode.trim());

          // Create client-coach relationship via API route to bypass RLS
          try {
            const clientResponse = await fetch('/api/clients/create', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                coach_id: selectedCoachId,
                client_id: data.user.id,
                status: 'active'
              })
            })

            const clientResult = await clientResponse.json()

            if (!clientResponse.ok) {
              console.error(
                "Error creating client-coach relationship:",
                clientResult
              );
              // Don't throw error here as the user account was created successfully
            }
          } catch (clientApiError) {
            console.error(
              "Error calling client creation API:",
              clientApiError
            );
            // Don't throw error here as the user account was created successfully
          }

          // Show success message
          setSuccess(
            "Account created successfully! Please check your email to verify your account."
          );

          // Reset form after delay
          setTimeout(() => {
            setEmail("");
            setPassword("");
            setFirstName("");
            setLastName("");
            setInviteCode("");
            setSelectedCoachId("");
            setAcceptedTerms(false);
            setIsLogin(true);
          }, 3000);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setExplicitSubmit(false); // Reset the explicit submit flag
    }
  };

  return (
    <AuthLayout>
      <AuthFormContainer
        title={isLogin ? "Welcome Back!" : "Start Your Journey"}
        description={
          isLogin
            ? "Sign in to continue your fitness journey"
            : "Create your account and begin transforming your health"
        }
      >
        {/* Segmented Control */}
        <div className="mb-8">
          <div className="bg-slate-100 rounded-2xl p-1 flex">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError("");
                setExplicitSubmit(false);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                isLogin
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setError("");
                setExplicitSubmit(false);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                !isLogin
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Sign Up
            </button>
          </div>
        </div>

        <form
          onSubmit={handleAuth}
          onKeyDown={handleKeyDown}
          className="space-y-6"
        >
          {/* Enhanced Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-3 h-3 text-red-600" />
              </div>
              {error}
            </div>
          )}

          {/* Enhanced Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-200 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-3 h-3 text-green-600" />
              </div>
              {success}
            </div>
          )}

          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="firstName"
                    className="text-sm font-medium text-slate-700"
                  >
                    First Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required={!isLogin}
                      className="pl-10 h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="John"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="lastName"
                    className="text-sm font-medium text-slate-700"
                  >
                    Last Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required={!isLogin}
                      className="pl-10 h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Doe"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="coach"
                  className="text-sm font-medium text-slate-700"
                >
                  Select Your Coach
                </Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                  <Select
                    value={selectedCoachId}
                    onValueChange={setSelectedCoachId}
                  >
                    <SelectTrigger className="pl-10 h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Choose your fitness coach" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
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
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    No coaches available. Please contact support.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="inviteCode"
                  className="text-sm font-medium text-slate-700"
                >
                  Invite Code
                </Label>
                <div className="relative">
                  <Gift className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="inviteCode"
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Enter your invite code"
                    required={!isLogin}
                    className="pl-10 h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Ask your coach or contact support for an invite code
                </p>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-sm font-medium text-slate-700"
            >
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-sm font-medium text-slate-700"
            >
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="pl-10 pr-12 h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {!isLogin && password && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Password strength:</span>
                  <span className={`font-medium ${passwordStrength.color}`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      passwordStrength.score === 1
                        ? "bg-red-500 w-1/3"
                        : passwordStrength.score === 2
                        ? "bg-orange-500 w-2/3"
                        : passwordStrength.score === 3
                        ? "bg-green-500 w-full"
                        : "w-0"
                    }`}
                  ></div>
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        password.length >= 6 ? "bg-green-500" : "bg-slate-300"
                      }`}
                    ></div>
                    <span>At least 6 characters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        password.length >= 8 ? "bg-green-500" : "bg-slate-300"
                      }`}
                    ></div>
                    <span>At least 8 characters (recommended)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        /[A-Z]/.test(password) && /[0-9]/.test(password)
                          ? "bg-green-500"
                          : "bg-slate-300"
                      }`}
                    ></div>
                    <span>Numbers and uppercase letters</span>
                  </div>
                </div>
              </div>
            )}
          </div>


          <Button
            type="submit"
            className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            disabled={loading}
            onClick={() => setExplicitSubmit(true)}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                {isLogin ? "Signing In..." : "Creating Account..."}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {isLogin ? (
                  <LogIn className="w-4 h-4" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {isLogin ? "Sign In" : "Create Account"}
              </div>
            )}
          </Button>
        </form>

        {/* Forgot Password Link */}
        {isLogin && (
          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Forgot your password?
            </button>
          </div>
        )}


        {/* Security Assurance */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Shield className="w-4 h-4 text-green-600" />
            <span>Your data is protected with enterprise-grade security</span>
          </div>
        </div>

        <FeatureHighlights />
      </AuthFormContainer>
    </AuthLayout>
  );
}
