"use client";

import { useState, useCallback } from "react";

const screens = [
  {
    title: "Zen Track",
    subtitle: "Focus on two. Relax into one.",
    description:
      "A relaxation game that occupies your full attention — quieting your mind through dual focus.",
    visual: "orbs", // two glowing orbs
  },
  {
    title: "Track with your eyes",
    subtitle: "Follow the teal ball with your gaze.",
    description:
      "Your camera tracks your eyes during the session. Nothing is recorded or stored.",
    visual: "eye",
  },
  {
    title: "Track with your finger",
    subtitle: "Follow the coral ball with your touch.",
    description:
      "The dual focus — eyes and finger — fully occupies your attention, creating calm.",
    visual: "touch",
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    if (current < screens.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      onComplete();
    }
  }, [current, onComplete]);

  const screen = screens[current];
  const isLast = current === screens.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-primary px-8">
      {/* Visual */}
      <div className="mb-10 flex h-32 items-center justify-center">
        {screen.visual === "orbs" && (
          <div className="flex gap-8">
            <div
              className="h-16 w-16 rounded-full animate-breathe-onboard"
              style={{
                background:
                  "radial-gradient(circle at 40% 40%, #a7f3d0, #5eead4 50%, rgba(94,234,212,0.2) 100%)",
                boxShadow: "0 0 30px 10px rgba(94,234,212,0.25)",
              }}
            />
            <div
              className="h-16 w-16 rounded-full animate-breathe-onboard-delayed"
              style={{
                background:
                  "radial-gradient(circle at 40% 40%, #fecdd3, #fca5a1 50%, rgba(252,165,161,0.2) 100%)",
                boxShadow: "0 0 30px 10px rgba(252,165,161,0.25)",
              }}
            />
          </div>
        )}
        {screen.visual === "eye" && (
          <div className="relative flex items-center justify-center">
            <div
              className="h-20 w-20 rounded-full animate-breathe-onboard"
              style={{
                background:
                  "radial-gradient(circle at 40% 40%, #a7f3d0, #5eead4 50%, rgba(94,234,212,0.2) 100%)",
                boxShadow: "0 0 30px 10px rgba(94,234,212,0.25)",
              }}
            />
            <svg
              className="absolute text-white/30"
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
        )}
        {screen.visual === "touch" && (
          <div className="relative flex items-center justify-center">
            <div
              className="h-20 w-20 rounded-full animate-breathe-onboard"
              style={{
                background:
                  "radial-gradient(circle at 40% 40%, #fecdd3, #fca5a1 50%, rgba(252,165,161,0.2) 100%)",
                boxShadow: "0 0 30px 10px rgba(252,165,161,0.25)",
              }}
            />
            <svg
              className="absolute text-white/30"
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <path d="M18 11V6a2 2 0 0 0-4 0v1M14 11V4a2 2 0 0 0-4 0v7M10 10.5V6a2 2 0 0 0-4 0v8" />
              <path d="M18 11a2 2 0 0 1 4 0v3a8 8 0 0 1-8 8h-2c-4.4 0-8-3.6-8-8v-1a2 2 0 0 1 4 0" />
            </svg>
          </div>
        )}
      </div>

      {/* Text */}
      <div
        key={current}
        className="animate-fade-in flex flex-col items-center gap-3 text-center"
      >
        <h2 className="text-2xl font-semibold text-text-primary">
          {screen.title}
        </h2>
        <p className="text-base text-eye-glow/70">{screen.subtitle}</p>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-text-muted">
          {screen.description}
        </p>
      </div>

      {/* Dots */}
      <div className="mt-12 flex gap-2">
        {screens.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === current
                ? "w-6 bg-eye-glow/60"
                : "w-1.5 bg-white/15"
            }`}
          />
        ))}
      </div>

      {/* Button */}
      <button
        onClick={next}
        className="mt-10 h-14 w-52 cursor-pointer rounded-full border border-eye-glow/40 bg-eye-glow/12 text-lg font-semibold text-eye-glow transition-all duration-500 ease-in-out"
      >
        {isLast ? "Get Started" : "Next"}
      </button>

      {/* Skip */}
      {!isLast && (
        <button
          onClick={onComplete}
          className="mt-4 cursor-pointer text-sm text-text-muted/30 transition-colors duration-300 hover:text-text-primary"
        >
          Skip
        </button>
      )}
    </div>
  );
}
