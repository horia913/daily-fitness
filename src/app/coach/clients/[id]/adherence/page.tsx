import { redirect } from "next/navigation";

export default async function CoachClientAdherenceRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/coach/clients/${id}/progress?section=wellness`);
}
