"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";
import { MobilityMetric } from "@/lib/progressTrackingService";
import {
  MOBILITY_REFERENCE_VALUES,
  getReferenceValue,
  getValueColor,
  formatReferenceText,
  ReferenceValue,
} from "@/lib/mobilityReferenceValues";
import { ProgressPhotoStorage } from "@/lib/progressPhotoStorage";
import Image from "next/image";

interface MobilityFormFieldsProps {
  assessmentType: "shoulder" | "hip" | "ankle" | "spine" | "overall";
  formData: Partial<MobilityMetric>;
  setFormData: (data: Partial<MobilityMetric>) => void;
  clientId: string;
  recordId?: string; // For editing existing records
}

export default function MobilityFormFields({
  assessmentType,
  formData,
  setFormData,
  clientId,
  recordId,
}: MobilityFormFieldsProps) {
  const theme = {
    text: "fc-text-primary",
    textSecondary: "fc-text-subtle",
    border: "border-[color:var(--fc-glass-border)]",
  };
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [side, setSide] = useState<"left" | "right">("left");

  const photos = formData.photos || [];
  const showSideToggle =
    assessmentType === "shoulder" || assessmentType === "hip";

  // Handle photo upload
  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhotos(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // For new records, use a temporary ID that will be updated after record creation
        const tempRecordId =
          recordId ||
          `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const photoUrl = await ProgressPhotoStorage.uploadPhoto(
          file,
          clientId,
          "mobility",
          tempRecordId,
          undefined
        );
        return photoUrl;
      });

      const newPhotoUrls = await Promise.all(uploadPromises);
      setFormData({
        ...formData,
        photos: [...photos, ...newPhotoUrls],
      });
    } catch (error) {
      console.error("Error uploading photos:", error);
      alert("Error uploading photos. Please try again.");
    } finally {
      setUploadingPhotos(false);
      // Reset input
      event.target.value = "";
    }
  };

  // Handle photo deletion
  const handlePhotoDelete = async (photoUrl: string, index: number) => {
    if (!recordId) {
      // For new records, just remove from state
      setFormData({
        ...formData,
        photos: photos.filter((_, i) => i !== index),
      });
      return;
    }

    try {
      await ProgressPhotoStorage.deletePhoto(
        photoUrl,
        clientId,
        "mobility",
        recordId
      );
      setFormData({
        ...formData,
        photos: photos.filter((_, i) => i !== index),
      });
    } catch (error) {
      console.error("Error deleting photo:", error);
      alert("Error deleting photo. Please try again.");
    }
  };

  // Render field with reference value
  const renderField = (
    fieldName: string,
    label: string,
    value: number | undefined,
    onChange: (value: number | undefined) => void,
    reference?: ReferenceValue
  ) => {
    const color = reference ? getValueColor(value, reference) : "gray";
    const colorClasses = {
      green:
        "fc-glass-soft border border-[color:var(--fc-status-success)]",
      yellow:
        "fc-glass-soft border border-[color:var(--fc-status-warning)]",
      red: "fc-glass-soft border border-[color:var(--fc-status-error)]",
      gray: "fc-glass-soft border border-[color:var(--fc-glass-border)]",
    };

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className={`${theme.textSecondary} text-sm`}>{label}</Label>
          {reference && (
            <span
              className={`fc-pill fc-pill-glass text-xs ${
                color === "green"
                  ? "fc-text-success"
                  : color === "yellow"
                  ? "fc-text-warning"
                  : color === "red"
                  ? "fc-text-error"
                  : "fc-text-subtle"
              }`}
            >
              {color === "green"
                ? "✓ Good"
                : color === "yellow"
                ? "⚠ Fair"
                : color === "red"
                ? "✗ Poor"
                : ""}
            </span>
          )}
        </div>
        <Input
          type="number"
          step="0.1"
          value={value || ""}
          onChange={(e) =>
            onChange(e.target.value ? parseFloat(e.target.value) : undefined)
          }
          className={`${colorClasses[color]} ${theme.text}`}
          placeholder="Enter value"
        />
        {reference && (
          <p className={`text-xs ${theme.textSecondary} mt-1`}>
            {formatReferenceText(reference)}
          </p>
        )}
      </div>
    );
  };

  // Render shoulder fields
  const renderShoulderFields = () => {
    if (assessmentType !== "shoulder") return null;

    const fields = [
      {
        name: `${side}_shoulder_ir` as keyof MobilityMetric,
        label: "Internal Rotation (IR)",
        ref: getReferenceValue("shoulder", "ir"),
      },
      {
        name: `${side}_shoulder_er` as keyof MobilityMetric,
        label: "External Rotation (ER)",
        ref: getReferenceValue("shoulder", "er"),
      },
      {
        name: `${side}_shoulder_abduction` as keyof MobilityMetric,
        label: "Abduction",
        ref: getReferenceValue("shoulder", "abduction"),
      },
      {
        name: `${side}_shoulder_flexion` as keyof MobilityMetric,
        label: "Flexion",
        ref: getReferenceValue("shoulder", "flexion"),
      },
    ];

    return (
      <div className="space-y-4">
        {/* Side Toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            onClick={() => setSide("left")}
            className={`flex-1 fc-btn fc-press ${
              side === "left" ? "fc-btn-primary" : "fc-btn-secondary"
            }`}
          >
            Left Side
          </Button>
          <Button
            type="button"
            onClick={() => setSide("right")}
            className={`flex-1 fc-btn fc-press ${
              side === "right" ? "fc-btn-primary" : "fc-btn-secondary"
            }`}
          >
            Right Side
          </Button>
        </div>

        <div className="space-y-4">
          {fields.map((field) => {
            const value = formData[field.name] as number | undefined;
            return (
              <div key={field.name}>
                {renderField(
                  field.name,
                  `${side.charAt(0).toUpperCase() + side.slice(1)} ${
                    field.label
                  }`,
                  value,
                  (newValue) => {
                    setFormData({
                      ...formData,
                      [field.name]: newValue,
                    });
                  },
                  field.ref
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render hip fields
  const renderHipFields = () => {
    if (assessmentType !== "hip") return null;

    const fields = [
      {
        name: `${side}_hip_ir` as keyof MobilityMetric,
        label: "Internal Rotation (IR)",
        ref: getReferenceValue("hip", "ir"),
      },
      {
        name: `${side}_hip_er` as keyof MobilityMetric,
        label: "External Rotation (ER)",
        ref: getReferenceValue("hip", "er"),
      },
      {
        name: `${side}_hip_straight_leg_raise` as keyof MobilityMetric,
        label: "Straight Leg Raise",
        ref: getReferenceValue("hip", "straight_leg_raise"),
      },
      {
        name: `${side}_hip_knee_to_chest` as keyof MobilityMetric,
        label: "Knee to Chest",
        ref: getReferenceValue("hip", "knee_to_chest"),
      },
    ];

    return (
      <div className="space-y-4">
        {/* Side Toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            onClick={() => setSide("left")}
            className={`flex-1 fc-btn fc-press ${
              side === "left" ? "fc-btn-primary" : "fc-btn-secondary"
            }`}
          >
            Left Side
          </Button>
          <Button
            type="button"
            onClick={() => setSide("right")}
            className={`flex-1 fc-btn fc-press ${
              side === "right" ? "fc-btn-primary" : "fc-btn-secondary"
            }`}
          >
            Right Side
          </Button>
        </div>

        <div className="space-y-4">
          {fields.map((field) => {
            const value = formData[field.name] as number | undefined;
            return (
              <div key={field.name}>
                {renderField(
                  field.name,
                  `${side.charAt(0).toUpperCase() + side.slice(1)} ${
                    field.label
                  }`,
                  value,
                  (newValue) => {
                    setFormData({
                      ...formData,
                      [field.name]: newValue,
                    });
                  },
                  field.ref
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render ankle fields
  const renderAnkleFields = () => {
    if (assessmentType !== "ankle") return null;

    const ref = getReferenceValue("ankle", "plantar_flexion");

    return (
      <div className="space-y-4">
        {renderField(
          "left_ankle_plantar_flexion",
          "Left Ankle Plantar Flexion",
          formData.left_ankle_plantar_flexion,
          (value) =>
            setFormData({ ...formData, left_ankle_plantar_flexion: value }),
          ref
        )}
        {renderField(
          "right_ankle_plantar_flexion",
          "Right Ankle Plantar Flexion",
          formData.right_ankle_plantar_flexion,
          (value) =>
            setFormData({ ...formData, right_ankle_plantar_flexion: value }),
          ref
        )}
      </div>
    );
  };

  // Render spine fields
  const renderSpineFields = () => {
    if (assessmentType !== "spine") return null;

    const ref = getReferenceValue("spine", "forward_lean");

    return (
      <div className="space-y-4">
        {renderField(
          "forward_lean",
          "Forward Lean",
          formData.forward_lean,
          (value) => setFormData({ ...formData, forward_lean: value }),
          ref
        )}
      </div>
    );
  };

  // Render overall fields
  const renderOverallFields = () => {
    if (assessmentType !== "overall") return null;

    return (
      <div className="space-y-4">
        {renderField(
          "toe_touch",
          "Toe Touch",
          formData.toe_touch,
          (value) => setFormData({ ...formData, toe_touch: value }),
          getReferenceValue("overall", "toe_touch")
        )}
        {renderField(
          "squat_depth",
          "Squat Depth",
          formData.squat_depth,
          (value) => setFormData({ ...formData, squat_depth: value }),
          getReferenceValue("overall", "squat_depth")
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Assessment-specific fields */}
      {renderShoulderFields()}
      {renderHipFields()}
      {renderAnkleFields()}
      {renderSpineFields()}
      {renderOverallFields()}

      {/* Photo Upload Section */}
      <div className="space-y-3">
        <Label className={`${theme.text} block`}>
          Photos{" "}
          <span className={`text-xs ${theme.textSecondary} font-normal`}>
            (Optional)
          </span>
        </Label>

        {/* Existing Photos */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((photoUrl, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-2xl overflow-hidden border border-[color:var(--fc-glass-border)]">
                  <Image
                    src={photoUrl}
                    alt={`Assessment photo ${index + 1}`}
                    width={200}
                    height={200}
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity fc-press"
                  onClick={() => handlePhotoDelete(photoUrl, index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        <div>
          <input
            type="file"
            id="photo-upload"
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
            className="hidden"
            disabled={uploadingPhotos}
          />
          <Label htmlFor="photo-upload">
            <Button
              type="button"
              variant="outline"
              className="w-full fc-btn fc-btn-secondary fc-press"
              disabled={uploadingPhotos}
              asChild
            >
              <span>
                <Camera className="w-4 h-4 mr-2" />
                {uploadingPhotos ? "Uploading..." : "Add Photos"}
              </span>
            </Button>
          </Label>
        </div>
      </div>
    </div>
  );
}
