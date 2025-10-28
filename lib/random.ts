export function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randFloat(min: number, max: number, decimals = 2) {
  const n = Math.random() * (max - min) + min;
  return Number(n.toFixed(decimals));
}

export function choice<T>(arr: readonly T[]): T {
  return arr[randInt(0, Math.max(0, arr.length - 1))];
}

export function shuffle<T>(arr: readonly T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function pick<T>(arr: readonly T[], count: number): T[] {
  if (count <= 0) return [];
  return shuffle(arr).slice(0, Math.min(count, arr.length));
}

export function randomDateBetween(from: Date, to: Date): Date {
  const start = from.getTime();
  const end = to.getTime();
  return new Date(randInt(start, end));
}

export function padNumber(n: number, width = 2) {
  return n.toString().padStart(width, "0");
}

export function randomCode(prefix = "", digits = 6) {
  return `${prefix}${padNumber(randInt(0, 10 ** digits - 1), digits)}`;
}
