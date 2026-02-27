// All times in America/New_York
export const TIMEZONE = "America/New_York";
export const ORDER_CLOSE_HOUR = 12; // noon ET — no new orders after this
export const MENU_HIDE_HOUR = 17; // 5 PM ET — card disappears

function getNowInET(): { year: number; month: number; day: number; hour: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") };
}

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Returns whether ordering is still open for the given date string (YYYY-MM-DD). */
export function isOrderingOpen(dateStr: string): boolean {
  const now = getNowInET();
  const todayStr = toDateStr(now.year, now.month, now.day);
  if (dateStr > todayStr) return true;
  if (dateStr < todayStr) return false;
  return now.hour < ORDER_CLOSE_HOUR;
}

/** Returns whether the menu card should still be visible for the given date. */
export function isMenuVisible(dateStr: string): boolean {
  const now = getNowInET();
  const todayStr = toDateStr(now.year, now.month, now.day);
  if (dateStr > todayStr) return true;
  if (dateStr < todayStr) return false;
  return now.hour < MENU_HIDE_HOUR;
}

/** Returns whether delivery can still be toggled for the given date (before 5 PM ET). */
export function isDeliveryModifiable(dateStr: string): boolean {
  const now = getNowInET();
  const todayStr = toDateStr(now.year, now.month, now.day);
  if (dateStr > todayStr) return true;
  if (dateStr < todayStr) return false;
  return now.hour < MENU_HIDE_HOUR;
}
