/**
 * Date utility helpers for daily, weekly, and monthly sales filtering.
 */

export function toLocalDateString(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayDateString(): string {
  return toLocalDateString(new Date());
}

export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalDateString(d);
}

export type WeekDayInfo = {
  dayName: string;
  fullDayName: string;
  dayNumber: number;
  dateString: string;
  formattedDate: string;
  isToday: boolean;
  isYesterday: boolean;
};

/**
 * Returns the 7 days of the week (Monday to Sunday) containing `referenceDate`.
 */
export function getCurrentWeekDays(referenceDate: Date = new Date()): WeekDayInfo[] {
  const now = new Date(referenceDate);
  const dayOfWeek = now.getDay();
  // Monday as first day: if Sunday (0), go back 6 days. Else 1 - dayOfWeek.
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + distanceToMonday);
  monday.setHours(0, 0, 0, 0);

  const todayStr = getTodayDateString();
  const yesterdayStr = getYesterdayDateString();

  const days: WeekDayInfo[] = [];
  const dayNamesShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dayNamesFull = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    const dateString = toLocalDateString(current);
    days.push({
      dayName: dayNamesShort[i],
      fullDayName: dayNamesFull[i],
      dayNumber: current.getDate(),
      dateString,
      formattedDate: current.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      isToday: dateString === todayStr,
      isYesterday: dateString === yesterdayStr,
    });
  }

  return days;
}
