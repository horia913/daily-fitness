/** Shared SVG path helpers for coach exercise charts. */

export function polylineSegments(
  values: (number | null)[],
  xFor: (i: number) => number,
  yFor: (v: number) => number,
): string[] {
  const segs: string[] = [];
  let buf: string[] = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v == null) {
      if (buf.length >= 2) segs.push(buf.join(" "));
      buf = [];
      continue;
    }
    buf.push(`${xFor(i)},${yFor(v)}`);
  }
  if (buf.length >= 2) segs.push(buf.join(" "));
  return segs;
}

/** Closed area under a series (gaps break into separate polygons). */
export function areaPaths(
  values: (number | null)[],
  xFor: (i: number) => number,
  yFor: (v: number) => number,
  baselineY: number,
): string[] {
  const paths: string[] = [];
  let pts: { x: number; y: number }[] = [];
  const flush = () => {
    if (pts.length < 2) {
      pts = [];
      return;
    }
    const first = pts[0]!;
    const last = pts[pts.length - 1]!;
    const line = pts.map((p) => `${p.x},${p.y}`).join(" L ");
    paths.push(
      `M${first.x},${baselineY} L ${line} L ${last.x},${baselineY} Z`,
    );
    pts = [];
  };
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v == null) {
      flush();
      continue;
    }
    pts.push({ x: xFor(i), y: yFor(v) });
  }
  flush();
  return paths;
}

export function formatWeekLabel(weekStart: string, index: number): string {
  return `W${index + 1}`;
}

export function formatWeekRange(weekStart: string): string {
  const d = new Date(`${weekStart}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return weekStart;
  const end = new Date(d);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (x: Date) =>
    x.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  return `${fmt(d)} – ${fmt(end)}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
