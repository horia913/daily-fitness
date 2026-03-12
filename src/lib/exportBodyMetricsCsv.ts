/**
 * Export body metrics history for a client as CSV and trigger download.
 */

import { getClientMeasurements } from "./measurementService";
import type { BodyMeasurement } from "./measurementService";

const CSV_COLUMNS = [
  "Date",
  "Weight (kg)",
  "Body Fat (%)",
  "Waist (cm)",
  "Muscle Mass (kg)",
  "Hips (cm)",
  "Left Arm (cm)",
  "Right Arm (cm)",
  "Left Thigh (cm)",
  "Right Thigh (cm)",
  "Notes",
] as const;

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowFromMeasurement(m: BodyMeasurement): string[] {
  return [
    m.measured_date ?? "",
    escapeCsvCell(m.weight_kg),
    escapeCsvCell(m.body_fat_percentage),
    escapeCsvCell(m.waist_circumference),
    escapeCsvCell(m.muscle_mass_kg),
    escapeCsvCell(m.hips_circumference),
    escapeCsvCell(m.left_arm_circumference),
    escapeCsvCell(m.right_arm_circumference),
    escapeCsvCell(m.left_thigh_circumference),
    escapeCsvCell(m.right_thigh_circumference),
    escapeCsvCell(m.notes),
  ];
}

/**
 * Build CSV string of body metrics for the client (all history, ordered by date desc).
 */
export function buildBodyMetricsCsv(measurements: BodyMeasurement[]): string {
  const header = CSV_COLUMNS.join(",");
  const rows = measurements.map(rowFromMeasurement).map((r) => r.join(","));
  return [header, ...rows].join("\n");
}

/**
 * Fetch body metrics for client, build CSV, and trigger browser download.
 * @param clientId - Client user ID
 * @param clientName - Optional display name for filename (sanitized)
 */
export async function exportBodyMetricsCsv(
  clientId: string,
  clientName?: string
): Promise<void> {
  const measurements = await getClientMeasurements(clientId);
  const csv = buildBodyMetricsCsv(measurements);
  const sanitized = (clientName ?? "Client").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  const today = new Date().toISOString().split("T")[0];
  const filename = `Body_Metrics_${sanitized}_${today}.csv`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
