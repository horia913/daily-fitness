import { redirect } from "next/navigation";

export default async function EditMealPlanRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/coach/nutrition/meal-plans/${id}`);
}
