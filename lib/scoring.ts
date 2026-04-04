export interface Point {
  x: number;
  y: number;
}

export function calculateAccuracy(
  tracked: Point,
  target: Point,
  maxDistance: number
): number {
  const dx = tracked.x - target.x;
  const dy = tracked.y - target.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return Math.max(0, (1 - distance / maxDistance) * 100);
}

export function getMaxDistance(): number {
  if (typeof window === "undefined") return 1000;
  return Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2) / 2;
}

export class RunningAverage {
  private total = 0;
  private count = 0;

  add(value: number) {
    this.total += value;
    this.count++;
  }

  get average(): number {
    if (this.count === 0) return 0;
    return this.total / this.count;
  }

  get sampleCount(): number {
    return this.count;
  }
}
