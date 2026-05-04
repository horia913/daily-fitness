/**
 * Kill switch for OneSignal web push and SDK usage.
 * Set NEXT_PUBLIC_PUSH_NOTIFICATIONS_ENABLED=true to enable (e.g. in .env.local).
 * Any value other than the string "true" leaves push disabled (default when unset).
 */
export function isPushNotificationsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PUSH_NOTIFICATIONS_ENABLED === "true";
}
