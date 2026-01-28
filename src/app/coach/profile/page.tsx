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
        setFormData({
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
        });
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
        <div
          style={{
            backgroundColor: "#E8E9F3",
            minHeight: "100vh",
            paddingBottom: "100px",
          }}
        >
          <div style={{ padding: "24px 20px" }}>
            <div className="max-w-4xl mx-auto">
              <div className="animate-pulse">
                <div className="h-8 bg-slate-200 rounded mb-4"></div>
                <div className="h-64 bg-slate-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
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

            {/* Enhanced Profile Picture Section */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "24px",
                padding: "24px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                marginBottom: "20px",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "18px",
                    background:
                      "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Camera className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      color: "#1A1A1A",
                    }}
                  >
                    Profile Picture
                  </h2>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "400",
                      color: "#6B7280",
                    }}
                  >
                    Your professional coaching photo
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="relative">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center border-4 border-white shadow-lg">
                      <User className="w-16 h-16 text-slate-500" />
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
                  <h3 className="font-semibold text-slate-800 text-lg mb-2">
                    Update Profile Picture
                  </h3>
                  <p className="text-slate-600 mb-3">
                    Upload a professional photo that represents your coaching
                    brand. This will be visible to your clients and help build
                    trust.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Info className="w-4 h-4" />
                    <span>Max size: 5MB • JPG, PNG supported</span>
                  </div>
                  {uploadingImage && (
                    <div className="flex items-center gap-2 mt-3 text-blue-600">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm font-medium">Uploading...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Personal Information */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "24px",
                padding: "24px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                marginBottom: "20px",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "18px",
                    background:
                      "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <User className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      color: "#1A1A1A",
                    }}
                  >
                    Personal Information
                  </h2>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "400",
                      color: "#6B7280",
                    }}
                  >
                    Basic details about yourself
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label
                    htmlFor="first_name"
                    className="text-sm font-semibold text-slate-700"
                  >
                    First Name
                  </Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        first_name: e.target.value,
                      }))
                    }
                    disabled={!editing}
                    className="rounded-2xl border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-3">
                  <Label
                    htmlFor="last_name"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Last Name
                  </Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        last_name: e.target.value,
                      }))
                    }
                    disabled={!editing}
                    className="rounded-2xl border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label
                  htmlFor="email"
                  className="text-sm font-semibold text-slate-700"
                >
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
                  className="rounded-2xl border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label
                    htmlFor="phone"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    disabled={!editing}
                    placeholder="+1 (555) 123-4567"
                    className="rounded-2xl border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-3">
                  <Label
                    htmlFor="date_of_birth"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Date of Birth
                  </Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        date_of_birth: e.target.value,
                      }))
                    }
                    disabled={!editing}
                    className="rounded-2xl border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label
                  htmlFor="bio"
                  className="text-sm font-semibold text-slate-700"
                >
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
                  className="rounded-2xl border-slate-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Notification Preferences */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "24px",
                padding: "24px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                marginBottom: "20px",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "18px",
                    background:
                      "linear-gradient(135deg, #F97316 0%, #EA580C 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Bell className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      color: "#1A1A1A",
                    }}
                  >
                    Notification Preferences
                  </h2>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "400",
                      color: "#6B7280",
                    }}
                  >
                    Control how and when you receive notifications
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-slate-800">
                        Client Messages
                      </p>
                      <p className="text-sm text-slate-600">
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
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-slate-800">
                        Workout Completions
                      </p>
                      <p className="text-sm text-slate-600">
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
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-slate-800">
                        Weekly Reports
                      </p>
                      <p className="text-sm text-slate-600">
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

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-slate-600" />
                    <div>
                      <p className="font-medium text-slate-800">
                        System Updates
                      </p>
                      <p className="text-sm text-slate-600">
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
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* App Preferences */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "24px",
                padding: "24px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                marginBottom: "20px",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "18px",
                    background:
                      "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Palette className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      color: "#1A1A1A",
                    }}
                  >
                    App Preferences
                  </h2>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "400",
                      color: "#6B7280",
                    }}
                  >
                    Customize your app experience
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700">
                    Theme
                  </Label>
                  <Select
                    value={appSettings.theme}
                    onValueChange={(value) =>
                      setAppSettings((prev) => ({ ...prev, theme: value }))
                    }
                  >
                    <SelectTrigger className="rounded-2xl border-slate-300 focus:border-blue-500 focus:ring-blue-500">
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
                  <Label className="text-sm font-semibold text-slate-700">
                    Units
                  </Label>
                  <Select
                    value={appSettings.units}
                    onValueChange={(value) =>
                      setAppSettings((prev) => ({ ...prev, units: value }))
                    }
                  >
                    <SelectTrigger className="rounded-2xl border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="metric">Metric (kg, cm)</SelectItem>
                      <SelectItem value="imperial">
                        Imperial (lbs, ft)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Enhanced Professional Information */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "24px",
                padding: "24px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                marginBottom: "20px",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "18px",
                    background:
                      "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <GraduationCap className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      color: "#1A1A1A",
                    }}
                  >
                    Professional Information
                  </h2>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "400",
                      color: "#6B7280",
                    }}
                  >
                    Your coaching credentials and expertise
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="experience_years">Years of Experience</Label>
                  <Input
                    id="experience_years"
                    value={formData.experience_years}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        experience_years: e.target.value,
                      }))
                    }
                    disabled={!editing}
                    placeholder="e.g., 5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">Hourly Rate</Label>
                  <Input
                    id="hourly_rate"
                    value={formData.hourly_rate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hourly_rate: e.target.value,
                      }))
                    }
                    disabled={!editing}
                    placeholder="e.g., $75/hour"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  disabled={!editing}
                  placeholder="City, State/Country"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="availability">Availability</Label>
                <Textarea
                  id="availability"
                  value={formData.availability}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      availability: e.target.value,
                    }))
                  }
                  disabled={!editing}
                  rows={2}
                  placeholder="e.g., Monday-Friday 9AM-6PM, Weekends by appointment"
                />
              </div>

              <div className="space-y-2">
                <Label>Specializations</Label>
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
                <Label>Certifications</Label>
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
                <Label>Languages</Label>
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
            </div>

            {/* Health Information */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "24px",
                padding: "24px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                marginBottom: "20px",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "18px",
                    background:
                      "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      color: "#1A1A1A",
                    }}
                  >
                    Health Information
                  </h2>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "400",
                      color: "#6B7280",
                    }}
                  >
                    Important health and safety details
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact">Emergency Contact</Label>
                <Input
                  id="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      emergency_contact: e.target.value,
                    }))
                  }
                  disabled={!editing}
                  placeholder="Name and phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medical_conditions">Medical Conditions</Label>
                <Textarea
                  id="medical_conditions"
                  value={formData.medical_conditions}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      medical_conditions: e.target.value,
                    }))
                  }
                  disabled={!editing}
                  rows={3}
                  placeholder="List any medical conditions..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="injuries">Injuries</Label>
                <Textarea
                  id="injuries"
                  value={formData.injuries}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      injuries: e.target.value,
                    }))
                  }
                  disabled={!editing}
                  rows={3}
                  placeholder="List any current or past injuries..."
                />
              </div>
            </div>

            {/* Enhanced Account Information */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "24px",
                padding: "24px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                marginBottom: "20px",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "18px",
                    background:
                      "linear-gradient(135deg, #6B7280 0%, #4B5563 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Settings className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      color: "#1A1A1A",
                    }}
                  >
                    Account Information
                  </h2>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "400",
                      color: "#6B7280",
                    }}
                  >
                    Your account details and status
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">
                        Member Since
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        {profile?.created_at
                          ? new Date(profile.created_at).toLocaleDateString()
                          : "N/A"}
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      Active
                    </Badge>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">
                        Account Role
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        Professional Coach
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                      Coach
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy & Security */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "24px",
                padding: "24px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                marginBottom: "20px",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "18px",
                    background:
                      "linear-gradient(135deg, #EC4899 0%, #DB2777 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      color: "#1A1A1A",
                    }}
                  >
                    Privacy & Security
                  </h2>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "400",
                      color: "#6B7280",
                    }}
                  >
                    Manage your account security and privacy
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-semibold text-slate-800">
                          Change Password
                        </p>
                        <p className="text-sm text-slate-600">
                          Update your account password
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" className="rounded-2xl">
                      <Lock className="w-4 h-4 mr-2" />
                      Change
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-semibold text-slate-800">
                          Privacy Policy
                        </p>
                        <p className="text-sm text-slate-600">
                          Read our privacy policy and terms
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" className="rounded-2xl">
                      <Globe className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Trash2 className="w-5 h-5 text-red-600" />
                      <div>
                        <p className="font-semibold text-slate-800">
                          Delete Account
                        </p>
                        <p className="text-sm text-slate-600">
                          Permanently delete your account
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="rounded-2xl border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Logout Section */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "24px",
                padding: "24px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                marginBottom: "20px",
              }}
            >
              <div className="text-center">
                <Button
                  variant="outline"
                  className="w-full rounded-2xl border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
