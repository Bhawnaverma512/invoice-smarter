// Per-device preferences (kept in this browser only).
export interface Prefs {
  deadlineAlerts: boolean;
  alertDays: number;
}
const KEY = "ledgerly:prefs";
const DEFAULTS: Prefs = { deadlineAlerts: true, alertDays: 3 };

export function getPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<Prefs>;
    return {
      deadlineAlerts: typeof p.deadlineAlerts === "boolean" ? p.deadlineAlerts : DEFAULTS.deadlineAlerts,
      alertDays: [1, 3, 7].includes(Number(p.alertDays)) ? Number(p.alertDays) : DEFAULTS.alertDays,
    };
  } catch {
    return DEFAULTS;
  }
}

export function setPrefs(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
    window.dispatchEvent(new Event("ledgerly:prefs"));
  } catch {
    /* storage unavailable */
  }
}
