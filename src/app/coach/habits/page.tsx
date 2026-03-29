import { redirect } from "next/navigation";

export default function CoachHabitsRedirectPage() {
  redirect("/coach/goals?tab=habits");
}
