"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
      email: string;
      first_name?: string;
      last_name?: string;
    }>
  >([]);
  const [explicitSubmit, setExplicitSubmit] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

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

  // Fetch coaches for dropdown
  const fetchCoaches = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .in("role", Array.from(coachRoles))
        .order("first_name", { ascending: true });

      if (error) {
        console.error("Error fetching coaches:", error);
        return;
      }

      setCoaches(data || []);
    } catch (error) {
      console.error("Error fetching coaches:", error);
    }
  };

  const coachRoles = new Set(["coach", "admin", "super_coach", "supercoach"]);

  // Redirect if already logged in
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        // Get user profile to determine role-based redirect
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          const redirectPath = coachRoles.has(profile.role ?? "")
            ? "/coach"
            : "/client";
          router.push(redirectPath);
        } else {
          // Fallback to client if no profile found
          router.push("/client");
        }
      }
    };

    checkUser();
  }, [router]);

  // Fetch coaches when component mounts
  useEffect(() => {
    fetchCoaches();
  }, []);

  // Handle URL parameters for invite links
  useEffect(() => {
    const inviteParam = searchParams.get("invite");
    const emailParam = searchParams.get("email");

    if (inviteParam) {
      setInviteCode(inviteParam);
      setIsLogin(false); // Switch to signup mode
    }

    if (emailParam) {
      setEmail(emailParam);
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
            profile && coachRoles.has(profile.role ?? "")
              ? "/coach"
              : "/client";
          setTimeout(() => router.push(redirectPath), 1500);
        }
      } else {
        // Validate terms acceptance
        if (!acceptedTerms) {
          throw new Error("Please accept the Terms & Conditions to continue");
        }

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
          await supabase
            .from("invite_codes")
            .update({
              used_count: supabase.raw("used_count + 1"),
              last_used_at: new Date().toISOString(),
            })
            .eq("code", inviteCode.trim());

          // Create client-coach relationship
          const { error: clientError } = await supabase.from("clients").insert({
            coach_id: selectedCoachId,
            client_id: data.user.id,
            status: "active",
          });

          if (clientError) {
            console.error(
              "Error creating client-coach relationship:",
              clientError
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
                          {coach.first_name && coach.last_name
                            ? `${coach.first_name} ${coach.last_name}`
                            : coach.email}
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

          {/* Terms & Conditions Checkbox */}
          {!isLogin && (
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor="terms"
                className="text-sm text-slate-700 leading-relaxed"
              >
                I agree to the{" "}
                <a
                  href="#"
                  className="text-blue-600 hover:text-blue-700 font-medium underline"
                >
                  Terms & Conditions
                </a>{" "}
                and{" "}
                <a
                  href="#"
                  className="text-blue-600 hover:text-blue-700 font-medium underline"
                >
                  Privacy Policy
                </a>
              </label>
            </div>
          )}

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

        {/* Social Login Options */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl border-slate-200 hover:bg-slate-50"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl border-slate-200 hover:bg-slate-50"
            >
              <svg
                className="w-5 h-5 mr-2"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
              </svg>
              Apple
            </Button>
          </div>
        </div>

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
