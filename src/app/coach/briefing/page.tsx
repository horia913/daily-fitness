import { redirect } from "next/navigation";

/** Alias — Briefing lives at `/coach` (coach landing). */
export default function CoachBriefingAliasPage() {
  redirect("/coach");
}
