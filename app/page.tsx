"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { markNavigated } from "@/lib/navigation";
import Onboarding from "@/components/Onboarding";

const ONBOARDED_KEY = "zentrack_onboarded";
const CALIBRATED_KEY = "zentrack_calibrated";

const durations = [
  { label: "20s — Test", value: 20 },
  { label: "2 min", value: 120 },
  { label: "5 min", value: 300 },
  { label: "7 min", value: 420 },
];

export default function Home() {
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARDED_KEY)) {
        setShowOnboarding(true);
      }
      if (localStorage.getItem(CALIBRATED_KEY)) {
        setIsCalibrated(true);
      }
    } catch { /* private browsing */ }
    setChecked(true);
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDED_KEY, "1");
    } catch { /* ignore */ }
    setShowOnboarding(false);
  }, []);

  if (!checked) return null;

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

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
              if (isCalibrated) {
                router.push(`/game?duration=${d.value}`);
              } else {
                router.push(`/calibration?duration=${d.value}`);
              }
            }}
            className="h-14 w-52 cursor-pointer rounded-full border border-white/8 bg-white/4 text-lg font-medium text-text-primary/70 transition-all duration-400 ease-in-out active:border-eye-glow/40 active:bg-eye-glow/12 active:text-eye-glow active:shadow-[0_0_20px_4px_rgba(94,234,212,0.15)]"
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="mt-14 flex flex-col items-center gap-3">
        {isCalibrated && (
          <button
            onClick={() => {
              try {
                localStorage.removeItem(CALIBRATED_KEY);
                // Clear WebGazer saved data
                localStorage.removeItem("webgazerGlobalData");
                localStorage.removeItem("webgazerLocalModelData");
              } catch { /* ignore */ }
              markNavigated();
              router.push(`/calibration?duration=120`);
            }}
            className="cursor-pointer text-sm text-eye-glow/50 transition-colors duration-300 hover:text-eye-glow"
          >
            Recalibrate
          </button>
        )}

        <Link
          href="/history"
          onClick={() => markNavigated()}
          className="text-sm text-text-muted transition-colors duration-300 hover:text-text-primary"
        >
          History
        </Link>
      </div>

      <p className="absolute bottom-4 text-[10px] text-text-muted/30">v0.3.0</p>
    </div>
  );
}
