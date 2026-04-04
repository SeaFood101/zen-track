"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { markNavigated } from "@/lib/navigation";

type TrackerType = "mediapipe" | "webgazer";

const trackers: { label: string; value: TrackerType; desc: string }[] = [
  { label: "MediaPipe", value: "mediapipe", desc: "Face Mesh iris tracking" },
  { label: "WebGazer", value: "webgazer", desc: "Regression-based gaze model" },
];

const durations = [
  { label: "20s — Test", value: 20 },
  { label: "2 min", value: 120 },
  { label: "5 min", value: 300 },
  { label: "7 min", value: 420 },
];

export default function Home() {
  const router = useRouter();
  const [tracker, setTracker] = useState<TrackerType>("mediapipe");
  const [duration, setDuration] = useState<number | null>(null);

  const handleBegin = () => {
    if (!duration) return;
    markNavigated();
    router.push(`/calibration?duration=${duration}&tracker=${tracker}`);
  };

  return (
    <div className="animate-fade-in flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-4xl font-semibold tracking-tight text-text-primary">
          Zen Track
        </h1>
        <p className="text-lg text-text-muted">
          Focus on two. Relax into one.
        </p>
      </div>

      {/* Tracker selection */}
      <div className="mt-12 flex flex-col items-center gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-text-muted/50">
          Eye Tracker
        </p>
        <div className="flex gap-3">
          {trackers.map((t) => (
            <button
              key={t.value}
              onClick={() => setTracker(t.value)}
              className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl border px-5 py-3 transition-all duration-400 ease-in-out ${
                tracker === t.value
                  ? "border-eye-glow/40 bg-eye-glow/10 text-eye-glow shadow-[0_0_16px_4px_rgba(94,234,212,0.1)]"
                  : "border-white/8 bg-white/4 text-text-primary/60"
              }`}
            >
              <span className="text-sm font-semibold">{t.label}</span>
              <span className="text-[10px] text-text-muted/50">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Duration selection */}
      <div className="mt-10 flex flex-col items-center gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-text-muted/50">
          Duration
        </p>
        <div className="flex flex-col items-center gap-3">
          {durations.map((d) => (
            <button
              key={d.value}
              onClick={() => setDuration(d.value)}
              className={`h-12 w-48 cursor-pointer rounded-full border text-base font-medium transition-all duration-400 ease-in-out ${
                duration === d.value
                  ? "border-eye-glow/40 bg-eye-glow/12 text-eye-glow shadow-[0_0_20px_4px_rgba(94,234,212,0.15)]"
                  : "border-white/8 bg-white/4 text-text-primary/70"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Begin button */}
      <button
        onClick={handleBegin}
        disabled={!duration}
        className={`mt-10 h-14 w-52 cursor-pointer rounded-full border text-lg font-semibold transition-all duration-500 ease-in-out ${
          duration
            ? "border-eye-glow/50 bg-eye-glow/18 text-eye-glow shadow-[0_0_24px_6px_rgba(94,234,212,0.12)]"
            : "border-white/6 bg-white/3 text-text-primary/25 opacity-50"
        }`}
      >
        Begin
      </button>

      <Link
        href="/history"
        onClick={() => markNavigated()}
        className="mt-12 text-sm text-text-muted transition-colors duration-300 hover:text-text-primary"
      >
        History
      </Link>
    </div>
  );
}
