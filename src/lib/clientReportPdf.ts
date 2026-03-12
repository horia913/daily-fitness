/**
 * Builds a multi-page PDF progress report from ReportData using jsPDF.
 */

import type { ReportData } from "./clientReportService";

const MARGIN = 18;
const PAGE_W = 210;
const TITLE_SIZE = 18;
const HEADING_SIZE = 12;
const BODY_SIZE = 10;
const SMALL_SIZE = 9;

function fmt(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function num(v: number | null | undefined): string {
  if (v == null) return "—";
  return String(v);
}

function addNewPage(doc: any): number {
  doc.addPage();
  return 20;
}

export async function buildClientReportPdf(
  reportData: ReportData,
  coachNotes?: string
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = 20;
  const { cover, body, training, wellness, nutrition } = reportData;

  // ——— Page 1: Cover ———
  doc.setFontSize(TITLE_SIZE);
  doc.text(
    `Progress Report — ${cover.clientFirstName} ${cover.clientLastName}`,
    MARGIN,
    y
  );
  y += 10;
  doc.setFontSize(SMALL_SIZE);
  doc.text(`Prepared by ${cover.coachFirstName} ${cover.coachLastName}`, MARGIN, y);
  y += 8;
  doc.text(`Report period: ${fmt(cover.startDate)} — ${fmt(cover.endDate)}`, MARGIN, y);
  y += 14;

  doc.setFontSize(HEADING_SIZE);
  doc.text("Summary", MARGIN, y);
  y += 8;
  doc.setFontSize(BODY_SIZE);
  doc.text(
    `Overall adherence: ${cover.overallAdherencePct != null ? cover.overallAdherencePct + "%" : "—"}`,
    MARGIN,
    y
  );
  y += 6;
  doc.text(`Training days this period: ${cover.trainingDaysThisPeriod}`, MARGIN, y);
  y += 6;
  doc.text(`Check-in streak: ${cover.checkinStreak} days`, MARGIN, y);
  y += 6;
  const programLine = cover.activeProgramName
    ? `${cover.activeProgramName}${cover.programWeekOfTotal ? " — " + cover.programWeekOfTotal : ""}`
    : "No active program";
  doc.text(`Active program: ${programLine}`, MARGIN, y);

  // ——— Page 2: Body Composition ———
  y = addNewPage(doc);
  doc.setFontSize(HEADING_SIZE);
  doc.text("Body Composition", MARGIN, y);
  y += 10;
  doc.setFontSize(BODY_SIZE);
  doc.text("Since you started", MARGIN, y);
  y += 6;
  doc.text(
    `Weight: ${num(body.sinceStart.weightStart)} kg → ${num(body.sinceStart.weightCurrent)} kg${body.sinceStart.weightChange != null ? ` (${body.sinceStart.weightChange > 0 ? "+" : ""}${body.sinceStart.weightChange.toFixed(1)} kg)` : ""}`,
    MARGIN,
    y
  );
  y += 6;
  doc.text(
    `Body fat: ${num(body.sinceStart.bodyFatStart)}% → ${num(body.sinceStart.bodyFatCurrent)}%${body.sinceStart.bodyFatChange != null ? ` (${body.sinceStart.bodyFatChange > 0 ? "+" : ""}${body.sinceStart.bodyFatChange.toFixed(1)}%)` : ""}`,
    MARGIN,
    y
  );
  y += 6;
  doc.text(
    `Waist: ${num(body.sinceStart.waistStart)} cm → ${num(body.sinceStart.waistCurrent)} cm${body.sinceStart.waistChange != null ? ` (${body.sinceStart.waistChange > 0 ? "+" : ""}${body.sinceStart.waistChange.toFixed(1)} cm)` : ""}`,
    MARGIN,
    y
  );
  y += 12;
  doc.text("This period", MARGIN, y);
  y += 6;
  doc.text(
    `Weight: ${num(body.thisPeriod.weightStart)} kg → ${num(body.thisPeriod.weightEnd)} kg${body.thisPeriod.weightChange != null ? ` (${body.thisPeriod.weightChange > 0 ? "+" : ""}${body.thisPeriod.weightChange.toFixed(1)} kg)` : ""}`,
    MARGIN,
    y
  );
  y += 6;
  doc.text(
    `Body fat: ${num(body.thisPeriod.bodyFatStart)}% → ${num(body.thisPeriod.bodyFatEnd)}%${body.thisPeriod.bodyFatChange != null ? ` (${body.thisPeriod.bodyFatChange > 0 ? "+" : ""}${body.thisPeriod.bodyFatChange.toFixed(1)}%)` : ""}`,
    MARGIN,
    y
  );
  y += 6;
  doc.text(
    `Waist: ${num(body.thisPeriod.waistStart)} cm → ${num(body.thisPeriod.waistEnd)} cm${body.thisPeriod.waistChange != null ? ` (${body.thisPeriod.waistChange > 0 ? "+" : ""}${body.thisPeriod.waistChange.toFixed(1)} cm)` : ""}`,
    MARGIN,
    y
  );
  y += 10;
  if (body.photoDatesInPeriod.length > 0) {
    doc.text(`Progress photos: ${body.photoDatesInPeriod.length} date(s) in period — available for comparison.`, MARGIN, y);
  }

  // ——— Page 3: Training ———
  y = addNewPage(doc);
  doc.setFontSize(HEADING_SIZE);
  doc.text("Training Summary", MARGIN, y);
  y += 10;
  doc.setFontSize(BODY_SIZE);
  doc.text(
    `Workout adherence: ${training.completedWorkouts} of ${training.scheduledWorkouts} scheduled completed${training.adherencePct != null ? ` (${training.adherencePct}%)` : ""}`,
    MARGIN,
    y
  );
  y += 8;
  doc.text(`Total volume lifted: ${training.totalVolumeKg} kg this period`, MARGIN, y);
  y += 6;
  const volTrend =
    training.volumeTrend === "up"
      ? "Volume increased compared to previous period"
      : training.volumeTrend === "down"
        ? "Volume decreased compared to previous period"
        : "Volume stable compared to previous period";
  doc.text(`Volume trend: ${volTrend}`, MARGIN, y);
  y += 12;
  if (training.topExercises.length > 0) {
    doc.text("Top exercises by volume", MARGIN, y);
    y += 6;
    training.topExercises.forEach((e) => {
      if (y > 270) y = addNewPage(doc);
      doc.text(`${e.name}: ${e.bestSet} (${e.volume} kg total)`, MARGIN + 4, y);
      y += 5;
    });
    y += 6;
  }
  if (training.prsThisPeriod.length > 0) {
    if (y > 260) y = addNewPage(doc);
    doc.text("Personal records this period", MARGIN, y);
    y += 6;
    training.prsThisPeriod.forEach((pr) => {
      if (y > 270) y = addNewPage(doc);
      doc.text(`${pr.exerciseName}: ${pr.record} on ${fmt(pr.date)}`, MARGIN + 4, y);
      y += 5;
    });
  }

  // ——— Page 4: Wellness ———
  y = addNewPage(doc);
  doc.setFontSize(HEADING_SIZE);
  doc.text("Wellness & Recovery", MARGIN, y);
  y += 10;
  doc.setFontSize(BODY_SIZE);
  doc.text(
    `Check-in consistency: ${wellness.daysCheckedIn} of ${wellness.totalDaysInPeriod} days (${wellness.checkInPct}%)`,
    MARGIN,
    y
  );
  y += 10;
  doc.text(
    `Sleep (avg): ${wellness.thisPeriod.sleep.toFixed(1)} hrs this period vs ${wellness.previousPeriod.sleep.toFixed(1)} hrs previous`,
    MARGIN,
    y
  );
  y += 6;
  doc.text(
    `Stress (avg 1–5): ${wellness.thisPeriod.stress.toFixed(1)} this period vs ${wellness.previousPeriod.stress.toFixed(1)} previous`,
    MARGIN,
    y
  );
  y += 6;
  doc.text(
    `Soreness (avg 1–5): ${wellness.thisPeriod.soreness.toFixed(1)} this period vs ${wellness.previousPeriod.soreness.toFixed(1)} previous`,
    MARGIN,
    y
  );
  y += 10;
  doc.text(`Insight: ${wellness.insight}`, MARGIN, y);

  // ——— Page 5: Nutrition (optional) ———
  if (nutrition?.hasData) {
    y = addNewPage(doc);
    doc.setFontSize(HEADING_SIZE);
    doc.text("Nutrition", MARGIN, y);
    y += 10;
    doc.setFontSize(BODY_SIZE);
    doc.text(
      `Nutrition adherence: ${nutrition.adherencePct != null ? nutrition.adherencePct + "%" : "—"} of days met targets`,
      MARGIN,
      y
    );
    if (nutrition.avgCalories != null || nutrition.targetCalories != null) {
      y += 6;
      doc.text(
        `Calories: avg ${num(nutrition.avgCalories)} vs target ${num(nutrition.targetCalories)}`,
        MARGIN,
        y
      );
    }
    if (nutrition.avgProtein != null || nutrition.targetProtein != null) {
      y += 6;
      doc.text(
        `Protein: avg ${num(nutrition.avgProtein)} vs target ${num(nutrition.targetProtein)}`,
        MARGIN,
        y
      );
    }
  }

  // ——— Final page: Coach notes & next steps ———
  y = addNewPage(doc);
  doc.setFontSize(HEADING_SIZE);
  doc.text("Coach Notes & Next Steps", MARGIN, y);
  y += 10;
  doc.setFontSize(BODY_SIZE);
  if (coachNotes?.trim()) {
    const lines = doc.splitTextToSize(coachNotes.trim(), PAGE_W - 2 * MARGIN);
    lines.forEach((line: string) => {
      if (y > 275) y = addNewPage(doc);
      doc.text(line, MARGIN, y);
      y += 5;
    });
    y += 8;
  } else {
    doc.text("(No notes added)", MARGIN, y);
    y += 10;
  }
  const suggestion = getAutoSuggestion(reportData);
  doc.setFontSize(SMALL_SIZE);
  doc.text(`Suggestion: ${suggestion}`, MARGIN, y);

  return doc.output("blob");
}

function getAutoSuggestion(data: ReportData): string {
  if (data.cover.overallAdherencePct != null && data.cover.overallAdherencePct >= 80)
    return "Client shows strong adherence. Consider maintaining current approach or progressing load.";
  if (data.wellness.checkInPct < 50)
    return "Check-in consistency has dropped — consider adjusting check-in frequency or following up.";
  if (data.body.thisPeriod.weightChange != null && data.body.thisPeriod.weightChange < -0.5)
    return "Body composition goals appear on track. Maintain current approach.";
  if (data.training.volumeTrend === "up" && data.wellness.thisPeriod.soreness <= data.wellness.previousPeriod.soreness)
    return "Volume increased with good recovery — great adaptation. Consider continuing progressive overload.";
  return "Review goals and adjust plan as needed.";
}

/** Sanitize for use in filename */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
}

export function getReportFilename(
  clientFirstName: string,
  clientLastName: string,
  startDate: string,
  endDate: string
): string {
  const name = sanitizeFilename(`${clientFirstName}_${clientLastName}`.trim() || "Client");
  return `Progress_Report_${name}_${startDate}_${endDate}.pdf`;
}
