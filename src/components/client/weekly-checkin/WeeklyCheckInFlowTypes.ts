import type { BodyMeasurement } from "@/lib/measurementService";
import type { CheckInConfig } from "@/lib/checkInConfigService";

export interface WeeklyCheckInBodyData {
  weight_kg: number | null;
  body_fat_percentage: number | null;
  waist_circumference: number | null;
  hips_circumference: number | null;
  torso_circumference: number | null;
  left_arm_circumference: number | null;
  right_arm_circumference: number | null;
  left_thigh_circumference: number | null;
  right_thigh_circumference: number | null;
  left_calf_circumference: number | null;
  right_calf_circumference: number | null;
  muscle_mass_kg: number | null;
  visceral_fat_level: number | null;
  notes: string;
}

export interface WeeklyCheckInPhotoFiles {
  front?: File;
  side?: File;
  back?: File;
}

export interface WeeklyCheckInFlowState {
  step: 1 | 2 | 3;
  bodyData: WeeklyCheckInBodyData;
  photoFiles: WeeklyCheckInPhotoFiles;
  notesToCoach: string;
}

export interface WeeklyCheckInFlowProps {
  clientId: string;
  config: CheckInConfig | null;
  lastMeasurement: BodyMeasurement | null;
  lastPhotoDate: string | null;
  onComplete: () => void;
  onBack: () => void;
}
