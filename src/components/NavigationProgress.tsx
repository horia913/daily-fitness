"use client";

import { AppProgressBar } from "next-nprogress-bar";

export default function NavigationProgress() {
  return (
    <AppProgressBar
      height="3px"
      color="var(--fc-accent)"
      options={{ showSpinner: false }}
      shallowRouting
    />
  );
}
