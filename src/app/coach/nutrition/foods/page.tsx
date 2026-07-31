import { redirect } from "next/navigation";

export default function NutritionFoodsRedirect() {
  redirect("/coach/nutrition?tab=foods");
}
