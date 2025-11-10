export function formatNumber(num: number): string {
  return new Intl.NumberFormat('th-TH').format(num);
}