import ClientWorkoutsClient from "./page.client";

export default function ClientWorkoutsPage() {
  const startMs = Date.now();
  const content = <ClientWorkoutsClient />;
  if (process.env.DEBUG_HARNESS === "true") {
    const handlerMs = Date.now() - startMs;
    console.log(`PAGE_WORKOUTS_TTFB handlerMs=${handlerMs}`);
  }
  return content;
}
