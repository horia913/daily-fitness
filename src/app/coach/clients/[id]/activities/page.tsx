import { redirect } from "next/navigation";

export default async function CoachClientActivitiesRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/coach/clients/${id}/profile?section=activities`);
}
