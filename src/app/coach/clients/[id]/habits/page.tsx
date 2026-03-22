import { redirect } from "next/navigation";

export default async function CoachClientHabitsRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/coach/clients/${id}/profile?section=habits`);
}
