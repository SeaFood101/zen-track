"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { markNavigated } from "@/lib/navigation";

const durations = [
  { label: "20s — Test", value: 20 },
  { label: "2 min", value: 120 },
  { label: "5 min", value: 300 },
  { label: "7 min", value: 420 },
];

export default function Home() {
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
            onClick={() => {
              markNavigated();
              router.push(`/calibration?duration=${d.value}`);
            }}
            className="h-14 w-52 cursor-pointer rounded-full border border-white/8 bg-white/4 text-lg font-medium text-text-primary/70 transition-all duration-400 ease-in-out active:border-eye-glow/40 active:bg-eye-glow/12 active:text-eye-glow active:shadow-[0_0_20px_4px_rgba(94,234,212,0.15)]"
          >
            {d.label}
          </button>
        ))}
      </div>

      <Link
        href="/history"
        onClick={() => markNavigated()}
        className="mt-16 text-sm text-text-muted transition-colors duration-300 hover:text-text-primary"
      >
        History
      </Link>
    </div>
  );
}
