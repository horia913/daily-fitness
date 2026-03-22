import { redirect } from "next/navigation";

export default async function CoachClientClipcardsRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/coach/clients/${id}/profile?section=subscription`);
}
