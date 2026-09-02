const usd = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 0,
  style: 'currency',
});

const date = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function formatMonthlyPrice(priceCents: number): string {
  return `${usd.format(priceCents / 100)} / month`;
}

export function formatDate(value: string): string {
  return date.format(new Date(value));
}
