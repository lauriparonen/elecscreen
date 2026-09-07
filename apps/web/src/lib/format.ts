const numberFmt = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
const priceFmt = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatKwh(value: number | null): string {
  if (value === null) return '—';
  return `${numberFmt.format(value)} kWh`;
}

export function formatPrice(value: number | null): string {
  if (value === null) return '—';
  return `${priceFmt.format(value)} snt/kWh`;
}

export function formatCoverage(reported: number, total: number): string {
  return `${reported}/${total} h`;
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}
