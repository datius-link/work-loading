const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function formatJobDate(value) {
  const date = parseDate(value);
  if (!date) return "";
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatRelativeDate(value) {
  const date = parseDate(value);
  if (!date) return "";
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffDays = Math.round((target - today) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === -1) return "Yesterday";
  return formatJobDate(date);
}

export function formatDeadline(value) {
  const date = parseDate(value);
  if (!date) return "No deadline";
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffDays = Math.round((target - today) / 86400000);
  if (diffDays < 0) return "Closed";
  if (diffDays === 0) return "Closing today";
  if (diffDays === 1) return "Closing tomorrow";
  return `Closes in ${diffDays} days`;
}
