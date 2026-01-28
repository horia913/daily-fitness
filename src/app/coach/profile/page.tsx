"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { DatabaseService } from "@/lib/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function CoachProfilePage() {
  const { user } = useAuth();
  const { performanceSettings } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
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

  useEffect(() => {
    if (user) {
      loadProfile();
    }
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
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
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
          alert(
            "Storage bucket not configured. Please contact administrator to set up avatar storage."
          );
        } else {
          alert(`Error uploading image: ${uploadError.message}`);
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
        alert("Error updating profile. Please try again.");
        return;
      }

      // Update local state
      setProfile({ ...profile, avatar_url: publicUrl });
      alert("Profile picture updated successfully!");
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Error uploading image. Please try again.");
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
        alert("Error updating profile. Please try again.");
        return;
      }

      setProfile({ ...profile, ...formData });
      setEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error updating profile. Please try again.");
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
          <div className="min-h-screen pb-[100px] p-6">
            <div className="max-w-4xl mx-auto">
              <div className="animate-pulse">
                <div className="h-8 rounded mb-4 bg-[color:var(--fc-glass-highlight)]" />
                <div className="h-64 rounded bg-[color:var(--fc-glass-highlight)]" />
              </div>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div
          style={{
            minHeight: "100vh",
            paddingBottom: "100px",
            padding: "24px 20px",
          }}
        >
          <div
            className="max-w-5xl mx-auto"
            style={{ display: "flex", flexDirection: "column", gap: "24px" }}
          >
            <GlassCard className="p-6 md:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <Badge className="fc-badge fc-badge-strong w-fit">Coach Profile</Badge>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-semibold text-[color:var(--fc-text-primary)]">
                        Coach Profile & Settings
                      </h1>
                      <p className="text-sm text-[color:var(--fc-text-dim)]">
                        Manage your professional information and app preferences.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  {editing ? (
                    <>
                      <Button variant="outline" onClick={handleCancel} className="fc-btn fc-btn-ghost">
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={saving} className="fc-btn fc-btn-primary">
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setEditing(true)} className="fc-btn fc-btn-primary">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>
            </GlassCard>

            {/* Profile Picture Section */}
            <Card className="fc-glass fc-card rounded-3xl overflow-hidden">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Camera className="w-7 h-7 text-white" />
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
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-all duration-300 shadow-lg hover:scale-110">
                          <Camera className="w-5 h-5 text-white" />
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
                      <div className="flex items-center gap-2 mt-3 text-blue-600">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-medium">Uploading...</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card className="fc-glass fc-card rounded-3xl overflow-hidden">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                    <User className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-[color:var(--fc-text-primary)]">Personal Information</CardTitle>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">Basic details about yourself</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-6">
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
            <Card className="fc-glass fc-card rounded-3xl overflow-hidden">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                    <Bell className="w-7 h-7 text-white" />
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
                      <MessageCircle className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-[color:var(--fc-text-primary)]">
                          Client Messages
                        </p>
                        <p className="text-sm text-[color:var(--fc-text-dim)]">
                          Get notified when clients send you messages
                        </p>
                      </div>
                    </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.clientMessages}
                      onChange={(e) =>
                        setNotifications((prev) => ({
                          ...prev,
                          clientMessages: e.target.checked,
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[color:var(--fc-glass-highlight)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)]">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-[color:var(--fc-text-primary)]">
                        Workout Completions
                      </p>
                      <p className="text-sm text-[color:var(--fc-text-dim)]">
                        Notifications when clients complete workouts
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.workoutCompletions}
                      onChange={(e) =>
                        setNotifications((prev) => ({
                          ...prev,
                          workoutCompletions: e.target.checked,
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[color:var(--fc-glass-highlight)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)]">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-[color:var(--fc-text-primary)]">
                        Weekly Reports
                      </p>
                      <p className="text-sm text-[color:var(--fc-text-dim)]">
                        Receive weekly progress summaries
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.weeklyReports}
                      onChange={(e) =>
                        setNotifications((prev) => ({
                          ...prev,
                          weeklyReports: e.target.checked,
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
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
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.systemUpdates}
                      onChange={(e) =>
                        setNotifications((prev) => ({
                          ...prev,
                          systemUpdates: e.target.checked,
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[color:var(--fc-glass-highlight)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
              </CardContent>
            </Card>

            {/* App Preferences */}
            <Card className="fc-glass fc-card rounded-3xl overflow-hidden">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Palette className="w-7 h-7 text-white" />
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
            <Card className="fc-glass fc-card rounded-3xl overflow-hidden">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <GraduationCap className="w-7 h-7 text-white" />
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
                          onClick={() => removeSpecialization(spec)}
                          className="ml-1 text-red-500 hover:text-red-700"
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
                          onClick={() => removeCertification(cert)}
                          className="ml-1 text-red-500 hover:text-red-700"
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
                          onClick={() => removeLanguage(lang)}
                          className="ml-1 text-red-500 hover:text-red-700"
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
            <Card className="fc-glass fc-card rounded-3xl overflow-hidden">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                    <Shield className="w-7 h-7 text-white" />
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
            <Card className="fc-glass fc-card rounded-3xl overflow-hidden">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-500 to-zinc-600 flex items-center justify-center">
                    <Settings className="w-7 h-7 text-white" />
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
                      <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
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
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                      Coach
                    </Badge>
                  </div>
                </div>
              </div>
              </CardContent>
            </Card>

            {/* Privacy & Security */}
            <Card className="fc-glass fc-card rounded-3xl overflow-hidden">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                    <Shield className="w-7 h-7 text-white" />
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
                        <Lock className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-semibold text-[color:var(--fc-text-primary)]">
                            Change Password
                          </p>
                          <p className="text-sm text-[color:var(--fc-text-dim)]">
                            Update your account password
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" className="fc-btn fc-btn-ghost rounded-2xl">
                        <Lock className="w-4 h-4 mr-2" />
                        Change
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-green-600" />
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
                        <Trash2 className="w-5 h-5 text-red-600" />
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
                        variant="outline"
                        className="rounded-2xl border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
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
            <Card className="fc-glass fc-card rounded-3xl overflow-hidden">
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
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
