"use client";

import { forwardRef } from "react";

interface BallProps {
  variant: "eye" | "touch";
  glowLevel?: "dim" | "normal" | "bright";
}

const Ball = forwardRef<HTMLDivElement, BallProps>(
  ({ variant, glowLevel = "normal" }, ref) => {
    const isEye = variant === "eye";

    const glowClass =
      glowLevel === "bright"
        ? isEye
          ? "glow-eye-bright"
          : "glow-touch-bright"
        : glowLevel === "dim"
          ? isEye
            ? "glow-eye-dim"
            : "glow-touch-dim"
          : isEye
            ? "glow-eye"
            : "glow-touch";

    const gradient = isEye
      ? "radial-gradient(circle at 35% 35%, #a7f3d0, #5eead4 40%, #2dd4bf 70%, rgba(45, 212, 191, 0.3) 100%)"
      : "radial-gradient(circle at 35% 35%, #fecdd3, #fca5a1 40%, #f87171 70%, rgba(248, 113, 113, 0.3) 100%)";

    return (
      <div
        ref={ref}
        className={`absolute flex h-[70px] w-[70px] items-center justify-center rounded-full transition-shadow duration-[2000ms] ease-in-out animate-breathe ${glowClass}`}
        style={{
          background: gradient,
          willChange: "transform",
        }}
      >
        {/* Focus circle removed — it was too distracting for a relaxation app */}
        {isEye ? (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(0,0,0,0.4)"
            strokeWidth="1.5"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(0,0,0,0.4)"
            strokeWidth="1.5"
          >
            <path d="M18 11V6a2 2 0 0 0-4 0v1M14 11V4a2 2 0 0 0-4 0v7M10 10.5V6a2 2 0 0 0-4 0v8" />
            <path d="M18 11a2 2 0 0 1 4 0v3a8 8 0 0 1-8 8h-2c-4.4 0-8-3.6-8-8v-1a2 2 0 0 1 4 0" />
          </svg>
        )}
      </div>
    );
  }
);

Ball.displayName = "Ball";

export default Ball;
