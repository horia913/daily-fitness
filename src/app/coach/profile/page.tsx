"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { CoachPageShell } from "@/components/coach-ui/CoachPageShell";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { DatabaseService } from "@/lib/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import {
  User,
  Mail,
  Calendar,
  Target,
  Award,
  Edit,
  Save,
  X,
  Camera,
  Settings,
  Shield,
  Activity,
  GraduationCap,
  MapPin,
  Clock,
  Bell,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Info,
  Star,
  Globe,
  Moon,
  Sun,
  Palette,
  Users,
  MessageCircle,
  BarChart3,
  Heart,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/toast-provider";

export default function CoachProfilePage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { performanceSettings } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [notifications, setNotifications] = useState({
    clientMessages: true,
    workoutCompletions: true,
    weeklyReports: true,
    systemUpdates: false,
  });
  const [appSettings, setAppSettings] = useState({
    theme: "light",
    units: "metric",
    language: "en",
  });
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    bio: "",
    phone: "",
    date_of_birth: "",
    specialization: [] as string[],
    certifications: [] as string[],
    experience_years: "",
    location: "",
    hourly_rate: "",
    availability: "",
    languages: [] as string[],
    emergency_contact: "",
    medical_conditions: "",
    injuries: "",
  });

  const profileTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    if (profileTimeoutRef.current) clearTimeout(profileTimeoutRef.current);
    profileTimeoutRef.current = setTimeout(() => {
      profileTimeoutRef.current = null;
      setLoading(false);
    }, 20_000);
    loadProfile().finally(() => {
      if (profileTimeoutRef.current) {
        clearTimeout(profileTimeoutRef.current);
        profileTimeoutRef.current = null;
      }
    });
    return () => {
      if (profileTimeoutRef.current) {
        clearTimeout(profileTimeoutRef.current);
        profileTimeoutRef.current = null;
      }
    };
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await DatabaseService.getProfile(user?.id || "");

      if (data) {
        setProfile(data);
        const profileData = data as any
        const initialForm = {
          first_name: profileData?.first_name || "",
          last_name: profileData?.last_name || "",
          email: profileData?.email || "",
          bio: profileData?.bio || "",
          phone: profileData?.phone || "",
          date_of_birth: profileData?.date_of_birth || "",
          specialization: profileData?.specialization || [],
          certifications: profileData?.certifications || [],
          experience_years: profileData?.experience_years || "",
          location: profileData?.location || "",
          hourly_rate: profileData?.hourly_rate || "",
          availability: profileData?.availability || "",
          languages: profileData?.languages || [],
          emergency_contact: profileData?.emergency_contact || "",
          medical_conditions: profileData?.medical_conditions || "",
          injuries: profileData?.injuries || "",
        };
        setFormData(initialForm);
        // Default to edit mode when profile is empty so coach can fill fields without clicking Edit
        const isEmpty = !(profileData?.first_name?.trim?.() || profileData?.last_name?.trim?.());
        setEditing(isEmpty);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      addToast({ title: "Please select an image file", variant: "default" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      addToast({ title: "Image size should be less than 5MB", variant: "default" });
      return;
    }

    try {
      setUploadingImage(true);

      // Create unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        console.error("Error details:", {
          message: uploadError.message,
          statusCode: (uploadError as any).statusCode,
          error: (uploadError as any).error,
        });

        if (uploadError.message.includes("row-level security policy")) {
          addToast({
            title: "Storage bucket not configured. Please contact administrator to set up avatar storage.",
            variant: "destructive",
          });
        } else {
          addToast({ title: "Couldn't upload image. Please try again.", variant: "destructive" });
        }
        return;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user?.id);

      if (updateError) {
        console.error("Update error:", updateError);
        addToast({ title: "Couldn't update profile. Please try again.", variant: "destructive" });
        return;
      }

      // Update local state
      setProfile({ ...profile, avatar_url: publicUrl });
      addToast({ title: "Profile picture updated successfully", variant: "success" });
    } catch (error) {
      console.error("Error uploading image:", error);
      addToast({ title: "Couldn't upload image. Please try again.", variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("profiles")
        .update(formData)
        .eq("id", user?.id);

      if (error) {
        console.error("Error updating profile:", error);
        addToast({ title: "Couldn't update profile. Please try again.", variant: "destructive" });
        return;
      }

      setProfile({ ...profile, ...formData });
      setEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      addToast({ title: "Couldn't update profile. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      email: profile?.email || "",
      bio: profile?.bio || "",
      phone: profile?.phone || "",
      date_of_birth: profile?.date_of_birth || "",
      specialization: profile?.specialization || [],
      certifications: profile?.certifications || [],
      experience_years: profile?.experience_years || "",
      location: profile?.location || "",
      hourly_rate: profile?.hourly_rate || "",
      availability: profile?.availability || "",
      languages: profile?.languages || [],
      emergency_contact: profile?.emergency_contact || "",
      medical_conditions: profile?.medical_conditions || "",
      injuries: profile?.injuries || "",
    });
    setEditing(false);
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess(false);

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      setChangingPassword(true);
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        setPasswordError(error.message);
        return;
      }

      setPasswordSuccess(true);
      setPasswordData({ newPassword: '', confirmPassword: '' });
      
      // Close modal after 2 seconds on success
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch (error: any) {
      setPasswordError(error.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const addSpecialization = (specialization: string) => {
    if (specialization && !formData.specialization.includes(specialization)) {
      setFormData((prev) => ({
        ...prev,
        specialization: [...prev.specialization, specialization],
      }));
    }
  };

  const removeSpecialization = (specializationToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      specialization: prev.specialization.filter(
        (s) => s !== specializationToRemove
      ),
    }));
  };

  const addCertification = (certification: string) => {
    if (certification && !formData.certifications.includes(certification)) {
      setFormData((prev) => ({
        ...prev,
        certifications: [...prev.certifications, certification],
      }));
    }
  };

  const removeCertification = (certificationToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter(
        (c) => c !== certificationToRemove
      ),
    }));
  };

  const addLanguage = (language: string) => {
    if (language && !formData.languages.includes(language)) {
      setFormData((prev) => ({
        ...prev,
        languages: [...prev.languages, language],
      }));
    }
  };

  const removeLanguage = (languageToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.filter((l) => l !== languageToRemove),
    }));
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          <CoachPageShell widthVariant="form-2xl" className="p-6 pb-[100px]">
            <PageSkeleton variant="form" />
          </CoachPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <CoachPageShell widthVariant="form-2xl" className="px-4 sm:px-6 pt-10 pb-[var(--fc-bottom-safe-area)] flex flex-col gap-8">
          <nav className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.history.back()}
                className="w-12 h-12 rounded-2xl fc-glass border border-[color:var(--fc-glass-border)] hover:bg-[color:var(--fc-glass-highlight)]"
              >
                <ArrowLeft className="w-6 h-6 fc-text-primary" />
              </Button>
              <h1 className="text-xl font-bold tracking-tight fc-text-primary">Coach Profile</h1>
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <Button variant="ghost" onClick={handleCancel} className="fc-btn fc-btn-ghost hidden sm:inline-flex">
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="fc-btn fc-btn-primary">
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setEditing(true)} className="fc-btn fc-btn-primary">
                    Edit
                  </Button>
                )}
              </div>
            </nav>

            {/* Profile Picture Section */}
            <Card className="fc-card-shell rounded-3xl overflow-hidden">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[color-mix(in_srgb,var(--fc-accent-purple)_22%,transparent)] border border-[color-mix(in_srgb,var(--fc-accent-purple)_35%,transparent)]">
                    <Camera className="w-7 h-7 text-[color:var(--fc-accent-purple)]" aria-hidden />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-[color:var(--fc-text-primary)]">Profile Picture</CardTitle>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">Your professional coaching photo</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="flex items-center gap-8">
                  <div className="relative">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Profile"
                        className="w-32 h-32 rounded-full object-cover border-4 border-[color:var(--fc-border-subtle)] shadow-lg"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-[color:var(--fc-glass-highlight)] flex items-center justify-center border-4 border-[color:var(--fc-border-subtle)] shadow-lg">
                        <User className="w-16 h-16 text-[color:var(--fc-text-subtle)]" />
                      </div>
                    )}
                    <div className="absolute -bottom-2 -right-2">
                      <label htmlFor="avatar-upload" className="cursor-pointer">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[color:var(--fc-status-info)] hover:opacity-90 transition-all duration-300 shadow-lg hover:scale-110">
                          <Camera className="w-5 h-5 text-[color:var(--fc-bg-base)]" aria-hidden />
                        </div>
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2 text-[color:var(--fc-text-primary)]">
                      Update Profile Picture
                    </h3>
                    <p className="mb-3 text-[color:var(--fc-text-dim)]">
                      Upload a professional photo that represents your coaching
                      brand. This will be visible to your clients and help build
                      trust.
                    </p>
                    <div className="flex items-center gap-2 text-sm text-[color:var(--fc-text-subtle)]">
                      <Info className="w-4 h-4" />
                      <span>Max size: 5MB • JPG, PNG supported</span>
                    </div>
                    {uploadingImage && (
                      <div className="flex items-center gap-2 mt-3 fc-text-dim">
                        <div className="w-4 h-4 border-2 border-[color:var(--fc-text-primary)] border-t-transparent rounded-full animate-spin" aria-hidden />
                        <span className="text-sm font-medium">Uploading...</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card className="fc-card-shell rounded-3xl overflow-hidden">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-semibold uppercase tracking-wider fc-text-dim">Personal Details</span>
                  <span className="flex-1 h-px bg-[color:var(--fc-glass-border)]" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="first_name" className="text-sm font-semibold text-[color:var(--fc-text-primary)]">
                      First Name
                    </Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, first_name: e.target.value }))
                      }
                      disabled={!editing}
                      className="fc-input rounded-2xl border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)] text-[color:var(--fc-text-primary)] placeholder:text-[color:var(--fc-text-subtle)]"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="last_name" className="text-sm font-semibold text-[color:var(--fc-text-primary)]">
                      Last Name
                    </Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, last_name: e.target.value }))
                      }
                      disabled={!editing}
                      className="fc-input rounded-2xl border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)] text-[color:var(--fc-text-primary)] placeholder:text-[color:var(--fc-text-subtle)]"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="email" className="text-sm font-semibold text-[color:var(--fc-text-primary)]">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    disabled={!editing}
                    className="fc-input rounded-2xl border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)] text-[color:var(--fc-text-primary)] placeholder:text-[color:var(--fc-text-subtle)]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="phone" className="text-sm font-semibold text-[color:var(--fc-text-primary)]">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      disabled={!editing}
                      placeholder="+1 (555) 123-4567"
                      className="fc-input rounded-2xl border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)] text-[color:var(--fc-text-primary)] placeholder:text-[color:var(--fc-text-subtle)]"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="date_of_birth" className="text-sm font-semibold text-[color:var(--fc-text-primary)]">
                      Date of Birth
                    </Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, date_of_birth: e.target.value }))
                      }
                      disabled={!editing}
                      className="fc-input rounded-2xl border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)] text-[color:var(--fc-text-primary)]"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="bio" className="text-sm font-semibold text-[color:var(--fc-text-primary)]">
                    Professional Bio
                  </Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    disabled={!editing}
                    rows={4}
                    placeholder="Tell us about yourself, your coaching philosophy, and what makes you unique as a fitness professional..."
                    className="fc-input rounded-2xl border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)] text-[color:var(--fc-text-primary)] placeholder:text-[color:var(--fc-text-subtle)] resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card className="fc-card-shell rounded-3xl overflow-hidden">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[color-mix(in_srgb,var(--fc-status-warning)_22%,transparent)] border border-[color-mix(in_srgb,var(--fc-status-warning)_32%,transparent)]">
                    <Bell className="w-7 h-7 text-[color:var(--fc-status-warning)]" aria-hidden />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-[color:var(--fc-text-primary)]">Notification Preferences</CardTitle>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">Control how and when you receive notifications</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)]">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="w-5 h-5 text-[color:var(--fc-status-info)]" aria-hidden />
                      <div>
                        <p className="font-medium text-[color:var(--fc-text-primary)]">
                          Client Messages
                        </p>
                        <p className="text-sm text-[color:var(--fc-text-dim)]">
                          Get notified when clients send you messages
                        </p>
                      </div>
                    </div>
                  <Switch
                    checked={notifications.clientMessages}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, clientMessages: checked }))
                    }
                    aria-label="Client Messages notifications"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)]">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 fc-text-success" aria-hidden />
                    <div>
                      <p className="font-medium text-[color:var(--fc-text-primary)]">
                        Workout Completions
                      </p>
                      <p className="text-sm text-[color:var(--fc-text-dim)]">
                        Notifications when clients complete workouts
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications.workoutCompletions}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, workoutCompletions: checked }))
                    }
                    aria-label="Workout Completions notifications"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)]">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-[color:var(--fc-accent-purple)]" aria-hidden />
                    <div>
                      <p className="font-medium text-[color:var(--fc-text-primary)]">
                        Weekly Reports
                      </p>
                      <p className="text-sm text-[color:var(--fc-text-dim)]">
                        Receive weekly progress summaries
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications.weeklyReports}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, weeklyReports: checked }))
                    }
                    aria-label="Weekly Reports notifications"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)]">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-[color:var(--fc-text-subtle)]" />
                    <div>
                      <p className="font-medium text-[color:var(--fc-text-primary)]">
                        System Updates
                      </p>
                      <p className="text-sm text-[color:var(--fc-text-dim)]">
                        App updates and maintenance notifications
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications.systemUpdates}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, systemUpdates: checked }))
                    }
                    aria-label="System Updates notifications"
                  />
                </div>
              </div>
              </CardContent>
            </Card>

            {/* App Preferences */}
            <Card className="fc-card-shell rounded-3xl overflow-hidden">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[color-mix(in_srgb,var(--fc-accent-cyan)_18%,transparent)] border border-[color-mix(in_srgb,var(--fc-accent-cyan)_32%,transparent)]">
                    <Palette className="w-7 h-7 text-[color:var(--fc-accent-cyan)]" aria-hidden />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-[color:var(--fc-text-primary)]">App Preferences</CardTitle>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">Customize your app experience</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-[color:var(--fc-text-primary)]">Theme</Label>
                    <Select
                      value={appSettings.theme}
                      onValueChange={(value) =>
                        setAppSettings((prev) => ({ ...prev, theme: value }))
                      }
                    >
                      <SelectTrigger className="fc-input rounded-2xl border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)] text-[color:var(--fc-text-primary)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light Mode</SelectItem>
                        <SelectItem value="dark">Dark Mode</SelectItem>
                        <SelectItem value="auto">Auto (System)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-[color:var(--fc-text-primary)]">Units</Label>
                    <Select
                      value={appSettings.units}
                      onValueChange={(value) =>
                        setAppSettings((prev) => ({ ...prev, units: value }))
                      }
                    >
                      <SelectTrigger className="fc-input rounded-2xl border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)] text-[color:var(--fc-text-primary)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="metric">Metric (kg, cm)</SelectItem>
                        <SelectItem value="imperial">Imperial (lbs, ft)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Professional Information */}
            <Card className="fc-card-shell rounded-3xl overflow-hidden">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[color-mix(in_srgb,var(--fc-domain-habits)_22%,transparent)] border border-[color-mix(in_srgb,var(--fc-domain-habits)_32%,transparent)]">
                    <GraduationCap className="w-7 h-7 text-[color:var(--fc-domain-habits)]" aria-hidden />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-[color:var(--fc-text-primary)]">Professional Information</CardTitle>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">Your coaching credentials and expertise</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="experience_years" className="text-[color:var(--fc-text-primary)]">Years of Experience</Label>
                    <Input
                      id="experience_years"
                      value={formData.experience_years}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, experience_years: e.target.value }))
                      }
                      disabled={!editing}
                      placeholder="e.g., 5"
                      className="fc-input rounded-2xl border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)] text-[color:var(--fc-text-primary)] placeholder:text-[color:var(--fc-text-subtle)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate" className="text-[color:var(--fc-text-primary)]">Hourly Rate</Label>
                    <Input
                      id="hourly_rate"
                      value={formData.hourly_rate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, hourly_rate: e.target.value }))
                      }
                      disabled={!editing}
                      placeholder="e.g., $75/hour"
                      className="fc-input rounded-2xl border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)] text-[color:var(--fc-text-primary)] placeholder:text-[color:var(--fc-text-subtle)]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-[color:var(--fc-text-primary)]">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, location: e.target.value }))
                    }
                    disabled={!editing}
                    placeholder="City, State/Country"
                    className="fc-input rounded-2xl border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)] text-[color:var(--fc-text-primary)] placeholder:text-[color:var(--fc-text-subtle)]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="availability" className="text-[color:var(--fc-text-primary)]">Availability</Label>
                  <Textarea
                    id="availability"
                    value={formData.availability}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, availability: e.target.value }))
                    }
                    disabled={!editing}
                    rows={2}
                    placeholder="e.g., Monday-Friday 9AM-6PM, Weekends by appointment"
                    className="fc-input rounded-2xl border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)] text-[color:var(--fc-text-primary)] placeholder:text-[color:var(--fc-text-subtle)]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[color:var(--fc-text-primary)]">Specializations</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.specialization.map((spec, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      {spec}
                      {editing && (
                        <button
                          type="button"
                          onClick={() => removeSpecialization(spec)}
                          className="ml-1 fc-text-error hover:opacity-80"
                          aria-label={`Remove specialization ${spec}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
                {editing && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add specialization..."
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          addSpecialization(e.currentTarget.value);
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        const input = document.querySelector(
                          'input[placeholder="Add specialization..."]'
                        ) as HTMLInputElement;
                        if (input?.value) {
                          addSpecialization(input.value);
                          input.value = "";
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-[color:var(--fc-text-primary)]">Certifications</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.certifications.map((cert, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      {cert}
                      {editing && (
                        <button
                          type="button"
                          onClick={() => removeCertification(cert)}
                          className="ml-1 fc-text-error hover:opacity-80"
                          aria-label={`Remove certification ${cert}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
                {editing && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add certification..."
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          addCertification(e.currentTarget.value);
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        const input = document.querySelector(
                          'input[placeholder="Add certification..."]'
                        ) as HTMLInputElement;
                        if (input?.value) {
                          addCertification(input.value);
                          input.value = "";
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-[color:var(--fc-text-primary)]">Languages</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.languages.map((lang, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      {lang}
                      {editing && (
                        <button
                          type="button"
                          onClick={() => removeLanguage(lang)}
                          className="ml-1 fc-text-error hover:opacity-80"
                          aria-label={`Remove language ${lang}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
                {editing && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add language..."
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          addLanguage(e.currentTarget.value);
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        const input = document.querySelector(
                          'input[placeholder="Add language..."]'
                        ) as HTMLInputElement;
                        if (input?.value) {
                          addLanguage(input.value);
                          input.value = "";
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>
              </CardContent>
            </Card>

            {/* Health Information */}
            <Card className="fc-card-shell rounded-3xl overflow-hidden">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[color-mix(in_srgb,var(--fc-status-error)_15%,transparent)] border border-[color-mix(in_srgb,var(--fc-status-error)_30%,transparent)]">
                    <Shield className="w-7 h-7 text-[color:var(--fc-status-error)]" aria-hidden />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-[color:var(--fc-text-primary)]">Health Information</CardTitle>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">Important health and safety details</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact" className="text-[color:var(--fc-text-primary)]">Emergency Contact</Label>
                  <Input
                    id="emergency_contact"
                    value={formData.emergency_contact}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, emergency_contact: e.target.value }))
                    }
                    disabled={!editing}
                    placeholder="Name and phone number"
                    className="fc-input rounded-2xl border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)] text-[color:var(--fc-text-primary)] placeholder:text-[color:var(--fc-text-subtle)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medical_conditions" className="text-[color:var(--fc-text-primary)]">Medical Conditions</Label>
                  <Textarea
                    id="medical_conditions"
                    value={formData.medical_conditions}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, medical_conditions: e.target.value }))
                    }
                    disabled={!editing}
                    rows={3}
                    placeholder="List any medical conditions..."
                    className="fc-input rounded-2xl border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)] text-[color:var(--fc-text-primary)] placeholder:text-[color:var(--fc-text-subtle)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="injuries" className="text-[color:var(--fc-text-primary)]">Injuries</Label>
                  <Textarea
                    id="injuries"
                    value={formData.injuries}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, injuries: e.target.value }))
                    }
                    disabled={!editing}
                    rows={3}
                    placeholder="List any current or past injuries..."
                    className="fc-input rounded-2xl border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)] text-[color:var(--fc-text-primary)] placeholder:text-[color:var(--fc-text-subtle)]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card className="fc-card-shell rounded-3xl overflow-hidden">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[color-mix(in_srgb,var(--fc-text-subtle)_18%,transparent)] border border-[color:var(--fc-glass-border)]">
                    <Settings className="w-7 h-7 fc-text-primary" aria-hidden />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-[color:var(--fc-text-primary)]">Account Information</CardTitle>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">Your account details and status</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 rounded-2xl border border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-[color:var(--fc-text-primary)]">
                          Member Since
                        </div>
                        <div className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                          {profile?.created_at
                            ? new Date(profile.created_at).toLocaleDateString()
                            : "N/A"}
                        </div>
                      </div>
                      <Badge className="border border-[color-mix(in_srgb,var(--fc-status-success)_40%,transparent)] bg-[color-mix(in_srgb,var(--fc-status-success)_12%,transparent)] fc-text-primary font-medium">
                        Active
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-[color:var(--fc-text-primary)]">
                          Account Role
                        </div>
                        <div className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                          Professional Coach
                        </div>
                      </div>
                    <Badge className="border border-[color-mix(in_srgb,var(--fc-status-info)_40%,transparent)] bg-[color-mix(in_srgb,var(--fc-status-info)_12%,transparent)] fc-text-primary font-medium">
                      Coach
                    </Badge>
                  </div>
                </div>
              </div>
              </CardContent>
            </Card>

            {/* Privacy & Security */}
            <Card className="fc-card-shell rounded-3xl overflow-hidden">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[color-mix(in_srgb,var(--fc-domain-challenges)_18%,transparent)] border border-[color-mix(in_srgb,var(--fc-domain-challenges)_32%,transparent)]">
                    <Shield className="w-7 h-7 text-[color:var(--fc-domain-challenges)]" aria-hidden />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-[color:var(--fc-text-primary)]">Privacy & Security</CardTitle>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">Manage your account security and privacy</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl border border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-[color:var(--fc-status-info)]" aria-hidden />
                        <div>
                          <p className="font-semibold text-[color:var(--fc-text-primary)]">
                            Change Password
                          </p>
                          <p className="text-sm text-[color:var(--fc-text-dim)]">
                            Update your account password
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        className="fc-btn fc-btn-ghost rounded-2xl"
                        onClick={() => setShowPasswordModal(true)}
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Change
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 fc-text-success" aria-hidden />
                        <div>
                          <p className="font-semibold text-[color:var(--fc-text-primary)]">
                            Privacy Policy
                          </p>
                          <p className="text-sm text-[color:var(--fc-text-dim)]">
                            Read our privacy policy and terms
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" className="fc-btn fc-btn-ghost rounded-2xl">
                        <Globe className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Trash2 className="w-5 h-5 fc-text-error" aria-hidden />
                        <div>
                          <p className="font-semibold text-[color:var(--fc-text-primary)]">
                            Delete Account
                          </p>
                          <p className="text-sm text-[color:var(--fc-text-dim)]">
                            Permanently delete your account
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-2xl border border-[color-mix(in_srgb,var(--fc-status-error)_35%,transparent)] fc-text-error hover:bg-[color-mix(in_srgb,var(--fc-status-error)_10%,transparent)]"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logout Section */}
            <Card className="fc-card-shell rounded-3xl overflow-hidden">
              <CardContent className="p-6">
                <Button
                  variant="outline"
                  className="w-full rounded-2xl fc-btn fc-btn-ghost border-[color:var(--fc-border-subtle)] text-[color:var(--fc-text-primary)] hover:bg-[color:var(--fc-surface)]"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>
        </CoachPageShell>

        <Dialog
          open={showPasswordModal}
          onOpenChange={(open) => {
            setShowPasswordModal(open);
            if (!open) {
              setPasswordData({ newPassword: "", confirmPassword: "" });
              setPasswordError("");
              setPasswordSuccess(false);
            }
          }}
        >
          <DialogContent className="max-w-md border border-[color:var(--fc-glass-border)]">
            <DialogHeader>
              <DialogTitle className="fc-text-primary">Change Password</DialogTitle>
            </DialogHeader>

            {passwordSuccess ? (
              <div className="text-center py-6">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 fc-text-success" aria-hidden />
                <p className="text-lg font-semibold fc-text-success">Password changed successfully!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    className="mt-1"
                  />
                </div>

                {passwordError && (
                  <div className="p-3 rounded-xl border border-[color-mix(in_srgb,var(--fc-status-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--fc-status-error)_12%,transparent)] fc-text-error text-sm">
                    {passwordError}
                  </div>
                )}

                <DialogFooter className="gap-2 sm:gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="sm:flex-1"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordData({ newPassword: "", confirmPassword: "" });
                      setPasswordError("");
                      setPasswordSuccess(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="fc-btn fc-btn-primary sm:flex-1"
                    onClick={() => void handlePasswordChange()}
                    disabled={changingPassword}
                  >
                    {changingPassword ? "Changing..." : "Change Password"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
