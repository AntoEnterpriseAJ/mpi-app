const DISPLAY_DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
});

const DISPLAY_DATETIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function parseDateOnlyToLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function formatDisplayDate(value: string): string {
  const dateOnly = parseDateOnlyToLocal(value);
  if (dateOnly) {
    return DISPLAY_DATE_FORMATTER.format(dateOnly);
  }

  const dateTime = new Date(value);
  if (Number.isNaN(dateTime.getTime())) {
    return value;
  }

  return DISPLAY_DATE_FORMATTER.format(dateTime);
}

export function formatDisplayDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return DISPLAY_DATETIME_FORMATTER.format(date);
}
