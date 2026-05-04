import type { ClientMetrics } from "@/lib/coachDashboardService";

export interface Client {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: "active" | "inactive" | "pending" | "at-risk";
  metrics: ClientMetrics;
}
