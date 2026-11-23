const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrCompact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const num = new Intl.NumberFormat("en-IN");

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const shortDateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

const monthFmt = new Intl.DateTimeFormat("en-IN", { month: "short" });

/** ₹1,24,500 */
export const formatCurrency = (value: number) => inr.format(value);

/** ₹1.2L, ₹45K. For headline numbers where precision is noise. */
export const formatCompactCurrency = (value: number) =>
  Math.abs(value) < 100000 ? inr.format(value) : inrCompact.format(value);

export const formatNumber = (value: number) => num.format(value);

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatShortDate = (iso: string) => shortDateFmt.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
export const formatMonth = (date: Date) => monthFmt.format(date);

/** "just now", "5m ago", "3h ago", "2d ago", then a plain date. */
export function formatRelative(iso: string, now = new Date()) {
  const seconds = Math.round((now.getTime() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatShortDate(iso);
}

/** Signed quantity for ledgers: +12, −4. Uses a real minus sign. */
export const formatSigned = (value: number) =>
  value > 0 ? `+${num.format(value)}` : `−${num.format(Math.abs(value))}`;

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}
