/**
 * Eye ball — moves within the TOP half of the screen.
 * Center: (w/2, h/4), amplitude: 35% width, 20% height (stays in top half).
 */
export function getEyeBallPosition(
  t: number,
  width: number,
  height: number
) {
  const cx = width / 2;
  const cy = height / 4;
  const ampX = width * 0.35;
  const ampY = height * 0.18;

  return {
    x: cx + ampX * Math.sin(0.4 * t),
    y: cy + ampY * Math.cos(0.3 * t),
  };
}

/**
 * Touch ball — moves within the BOTTOM half of the screen.
 * Center: (w/2, 3h/4), amplitude: 35% width, 20% height (stays in bottom half).
 */
export function getTouchBallPosition(
  t: number,
  width: number,
  height: number
) {
  const cx = width / 2;
  const cy = (height * 3) / 4;
  const ampX = width * 0.35;
  const ampY = height * 0.18;

  return {
    x: cx + ampX * Math.sin(0.5 * t + Math.PI / 3),
    y: cy + ampY * Math.cos(0.35 * t + Math.PI / 4),
  };
}
