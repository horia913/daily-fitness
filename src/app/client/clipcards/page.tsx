import { redirect } from "next/navigation";

/** Legacy route: subscription status is on Profile. */
export default function ClientClipcardsRedirectPage() {
  redirect("/client/profile");
}
