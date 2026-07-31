import { redirect } from "next/navigation";

export default function NutritionAssignmentsRedirect() {
  redirect("/coach/nutrition?tab=assignments");
}
