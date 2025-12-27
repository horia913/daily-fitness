import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  TrendingUp,
  Users,
  Dumbbell,
  Target,
  Award,
  Zap,
  Activity,
} from "lucide-react";

interface Program {
  id: string;
  name: string;
  description?: string;
  coach_id: string;
  difficulty_level: "beginner" | "intermediate" | "advanced";
  duration_weeks: number;
  target_audience: string;
  is_public?: boolean; // Optional - not in database schema
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProgramCardProps {
  program: Program;
  onEdit: () => void;
  onOpenDetails: () => void;
  onDelete?: () => void;
  onAssign?: () => void;
  assignmentCount?: number;
}

function getTargetAudienceIcon(audience: string) {
  switch (audience?.toLowerCase()) {
    case "strength":
      return Dumbbell;
    case "weight_loss":
      return Target;
    case "muscle_gain":
      return Zap;
    case "endurance":
      return Activity;
    case "athletic_performance":
      return Award;
    case "general_fitness":
    default:
      return Users;
  }
}

export default function ProgramCard({
  program,
  onEdit,
  onOpenDetails,
  onDelete,
  onAssign,
  assignmentCount = 0,
}: ProgramCardProps) {
  const TargetIcon = getTargetAudienceIcon(program.target_audience);

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "24px",
        padding: "24px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        marginBottom: "20px",
        cursor: "pointer",
      }}
      className="hover:shadow-xl transition-all duration-300"
      onClick={onOpenDetails}
    >
      <div className="h-full flex flex-col">
        <div
          className="flex items-center gap-4"
          style={{ marginBottom: "20px" }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, #4CAF50 0%, #81C784 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TargetIcon
              style={{ width: "32px", height: "32px", color: "#FFFFFF" }}
            />
          </div>

          <div className="flex-1">
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#1A1A1A",
                marginBottom: "8px",
              }}
            >
              {program.name}
            </h3>
            <div className="flex items-center gap-2">
              <Badge
                style={{
                  backgroundColor:
                    program.difficulty_level === "beginner"
                      ? "#D1FAE5"
                      : program.difficulty_level === "intermediate"
                      ? "#FEF3C7"
                      : "#FEE2E2",
                  color:
                    program.difficulty_level === "beginner"
                      ? "#065F46"
                      : program.difficulty_level === "intermediate"
                      ? "#92400E"
                      : "#991B1B",
                  borderRadius: "12px",
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: "600",
                  border: "0",
                }}
              >
                {program.difficulty_level}
              </Badge>
              <div
                className="flex items-center gap-1.5"
                style={{
                  padding: "4px 8px",
                  backgroundColor: "#F3F4F6",
                  borderRadius: "12px",
                }}
              >
                <Calendar
                  style={{ width: "14px", height: "14px", color: "#6B7280" }}
                />
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#6B7280",
                  }}
                >
                  {program.duration_weeks}w
                </span>
              </div>
            </div>
          </div>
        </div>

        {program.description && (
          <div style={{ marginBottom: "20px" }}>
            <p
              className="line-clamp-2"
              style={{ fontSize: "14px", fontWeight: "400", color: "#6B7280" }}
            >
              {program.description}
            </p>
          </div>
        )}

        <div
          className="grid grid-cols-3 gap-4"
          style={{ marginBottom: "20px" }}
        >
          <div
            className="flex flex-col items-center"
            style={{
              padding: "16px",
              backgroundColor: "#DBEAFE",
              borderRadius: "16px",
              border: "2px solid #93C5FD",
            }}
          >
            <Calendar
              style={{
                width: "24px",
                height: "24px",
                marginBottom: "8px",
                color: "#2196F3",
              }}
            />
            <span
              style={{ fontSize: "20px", fontWeight: "700", color: "#1A1A1A" }}
            >
              {program.duration_weeks}
            </span>
            <span
              style={{ fontSize: "12px", fontWeight: "400", color: "#6B7280" }}
            >
              weeks
            </span>
          </div>
          <div
            className="flex flex-col items-center"
            style={{
              padding: "16px",
              backgroundColor: "#D1FAE5",
              borderRadius: "16px",
              border: "2px solid #6EE7B7",
            }}
          >
            <Users
              style={{
                width: "24px",
                height: "24px",
                marginBottom: "8px",
                color: "#4CAF50",
              }}
            />
            <span
              style={{ fontSize: "20px", fontWeight: "700", color: "#1A1A1A" }}
            >
              {assignmentCount}
            </span>
            <span
              style={{ fontSize: "12px", fontWeight: "400", color: "#6B7280" }}
            >
              clients
            </span>
          </div>
          <div
            className="flex flex-col items-center"
            style={{
              padding: "16px",
              backgroundColor: "#FEF3C7",
              borderRadius: "16px",
              border: "2px solid #FCD34D",
            }}
          >
            <TrendingUp
              style={{
                width: "24px",
                height: "24px",
                marginBottom: "8px",
                color: "#F59E0B",
              }}
            />
            <span
              style={{ fontSize: "12px", fontWeight: "600", color: "#92400E" }}
            >
              Progress
            </span>
            <span
              style={{ fontSize: "10px", fontWeight: "400", color: "#6B7280" }}
            >
              Tracked
            </span>
          </div>
        </div>

        <div
          className="flex items-center gap-2"
          style={{ paddingTop: "12px", borderTop: "1px solid #E5E7EB" }}
        >
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="flex-1"
            style={{
              borderRadius: "20px",
              padding: "12px 16px",
              fontSize: "14px",
              fontWeight: "600",
              backgroundColor: "#4CAF50",
              color: "#FFFFFF",
            }}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAssign?.();
            }}
            style={{
              borderRadius: "20px",
              padding: "10px",
              border: "2px solid #4CAF50",
              color: "#4CAF50",
              backgroundColor: "transparent",
            }}
            className="hover:bg-green-50"
          >
            Assign
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            style={{
              borderRadius: "20px",
              padding: "10px",
              border: "2px solid #EF4444",
              color: "#EF4444",
              backgroundColor: "transparent",
            }}
            className="hover:bg-red-50"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
