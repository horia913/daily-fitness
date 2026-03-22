import { redirect } from "next/navigation";

/** Legacy route: subscriptions are managed per client on Profile → Subscription. */
export default function CoachClipcardsRedirectPage() {
  redirect("/coach/clients");
}
