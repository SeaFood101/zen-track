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
  const ratio = Math.min(distance / maxDistance, 1);
  // Power curve: forgiving up close, drops off further away
  return Math.max(0, Math.pow(1 - ratio, 0.6) * 100);
}

export function getMaxDistance(): number {
  if (typeof window === "undefined") return 1000;
  // Generous threshold: ~50% screen width — accounts for tracking lag on moving targets
  return window.innerWidth * 0.5;
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
