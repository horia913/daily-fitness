import { redirect } from "next/navigation";

export default function ExerciseCategoriesRedirectPage() {
  redirect("/coach/categories?tab=exercises");
}
