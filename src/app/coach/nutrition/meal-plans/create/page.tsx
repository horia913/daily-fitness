import { redirect } from "next/navigation";

export default function CreateMealPlanRedirect() {
  redirect("/coach/nutrition?create=1");
}
