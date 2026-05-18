/**
 * Android Gentle Fix — legacy mitigations for Chrome/WebView quirks (text scaling,
 * touch scrolling). Bottom nav DOM was refactored to `[data-fc-bottom-nav].fc-bottom-nav-float`;
 * older `nav.fixed.bottom-0` selectors never matched.
 *
 * Disposition (Phase 1): **(a) + (b)** — update selectors to the current shell; run only on
 * Android **and** viewports under 1024px so desktop coach/client shells (no bottom nav) are
 * untouched. Heavy debug UI/logging removed to avoid console noise.
 *
 * TODO(Horica): Re-verify on a physical Android device after nav refactors; CSS in
 * `android-fixes.css` + `globals.css` already pins the floating nav.
 */

function queryBottomNav(): HTMLElement | null {
  const el = document.querySelector(
    "[data-fc-bottom-nav].fc-bottom-nav-float"
  ) as HTMLElement | null;
  if (el) return el;
  return document.querySelector("nav.fc-bottom-nav-float") as HTMLElement | null;
}

export const applyAndroidGentleFix = () => {
  if (typeof window === "undefined") return;

  if (window.innerWidth >= 1024) {
    return;
  }

  const isAndroid = /Android/i.test(navigator.userAgent);
  if (!isAndroid) {
    return;
  }

  const applyGentleFixes = () => {
    document.documentElement.style.setProperty("-webkit-text-size-adjust", "100%");
    document.body.style.setProperty("-webkit-text-size-adjust", "100%");
    document.body.style.setProperty("-webkit-font-smoothing", "antialiased");
    document.documentElement.style.setProperty(
      "-webkit-overflow-scrolling",
      "touch"
    );
    document.body.style.setProperty("-webkit-overflow-scrolling", "touch");

    if (!document.body.classList.contains("android-device")) {
      document.body.classList.add("android-device");
    }

    window.setTimeout(() => {
      const bottomNav = queryBottomNav();
      if (!bottomNav) {
        return;
      }

      bottomNav.style.setProperty("position", "fixed", "important");
      bottomNav.style.setProperty("z-index", "10000", "important");
      bottomNav.style.setProperty("transform", "none", "important");

      const inner = bottomNav.querySelector(".fc-bottom-nav-inner") as HTMLElement | null;
      if (inner) {
        const computedStyle = window.getComputedStyle(inner);
        if (computedStyle.flexDirection === "column") {
          inner.style.display = "flex";
          inner.style.flexDirection = "row";
          inner.style.alignItems = "center";
          inner.style.justifyContent = "space-between";
          inner.style.width = "100%";
        }
      }
    }, 300);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyGentleFixes, { once: true });
  } else {
    applyGentleFixes();
  }
};
