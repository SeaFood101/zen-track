export function getEyeBallPosition(
  t: number,
  width: number,
  height: number
) {
  const cx = width / 2;
  const cy = height / 2;
  const ampX = width * 0.35;
  const ampY = height * 0.35;

  return {
    x: cx + ampX * Math.sin(0.4 * t),
    y: cy + ampY * Math.cos(0.3 * t),
  };
}

export function getTouchBallPosition(
  t: number,
  width: number,
  height: number
) {
  const cx = width / 2;
  const cy = height / 2;
  const ampX = width * 0.35;
  const ampY = height * 0.35;

  return {
    x: cx + ampX * Math.sin(0.5 * t + Math.PI / 3),
    y: cy + ampY * Math.cos(0.35 * t + Math.PI / 4),
  };
}
