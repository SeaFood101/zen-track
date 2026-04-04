"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const durations = [
  { label: "20s — Test", value: 20 },
  { label: "2 min", value: 120 },
  { label: "5 min", value: 300 },
  { label: "7 min", value: 420 },
];

export default function Home() {
  const [selected, setSelected] = useState<number | null>(null);
  const router = useRouter();

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

      <div className="mt-14 flex flex-col items-center gap-4">
        {durations.map((d) => (
          <button
            key={d.value}
            onClick={() => setSelected(d.value)}
            className={`h-14 w-52 cursor-pointer rounded-full border text-lg font-medium transition-all duration-400 ease-in-out ${
              selected === d.value
                ? "border-eye-glow/40 bg-eye-glow/12 text-eye-glow shadow-[0_0_20px_4px_rgba(94,234,212,0.15)]"
                : "border-white/8 bg-white/4 text-text-primary/70"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => {
          if (selected) router.push(`/calibration?duration=${selected}`);
        }}
        disabled={!selected}
        className={`mt-12 h-14 w-52 cursor-pointer rounded-full border text-lg font-semibold transition-all duration-500 ease-in-out ${
          selected
            ? "border-eye-glow/50 bg-eye-glow/18 text-eye-glow shadow-[0_0_24px_6px_rgba(94,234,212,0.12)]"
            : "border-white/6 bg-white/3 text-text-primary/25 opacity-50"
        }`}
      >
        Begin
      </button>

      <Link
        href="/history"
        className="mt-16 text-sm text-text-muted transition-colors duration-300 hover:text-text-primary"
      >
        History
      </Link>
    </div>
  );
}
