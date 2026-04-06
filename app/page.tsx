"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { markNavigated } from "@/lib/navigation";
import Onboarding from "@/components/Onboarding";

const ONBOARDED_KEY = "zentrack_onboarded";
const CALIBRATED_KEY = "zentrack_calibrated";
const SHOW_TRACKER_KEY = "zentrack_show_tracker";

const durations = [
  { label: "2 min", value: 120 },
  { label: "5 min", value: 300 },
  { label: "7 min", value: 420 },
];

export default function Home() {
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [showTracker, setShowTracker] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARDED_KEY)) {
        setShowOnboarding(true);
      }
      if (localStorage.getItem(CALIBRATED_KEY)) {
        setIsCalibrated(true);
      }
      if (localStorage.getItem(SHOW_TRACKER_KEY) === "1") {
        setShowTracker(true);
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

      <Link
        href="/history"
        onClick={() => markNavigated()}
        className="mt-14 text-sm text-text-muted transition-colors duration-300 hover:text-text-primary"
      >
        History
      </Link>

      {/* Admin Control Panel */}
      <div className="mt-8 flex flex-col items-center">
        <button
          onClick={() => setAdminOpen((o) => !o)}
          className="cursor-pointer text-xs text-text-muted/25 transition-colors duration-300 hover:text-text-muted/50"
        >
          {adminOpen ? "Hide Admin" : "Admin Control"}
        </button>

        {adminOpen && (
          <div className="mt-4 flex w-64 flex-col items-center gap-3 rounded-2xl border border-white/6 bg-white/3 p-5">
            {/* 20s Test */}
            <button
              onClick={() => {
                markNavigated();
                if (isCalibrated) {
                  router.push("/game?duration=20");
                } else {
                  router.push("/calibration?duration=20");
                }
              }}
              className="h-10 w-full cursor-pointer rounded-full border border-white/8 bg-white/4 text-sm font-medium text-text-primary/60 transition-all duration-300 active:border-eye-glow/40 active:bg-eye-glow/12 active:text-eye-glow"
            >
              20s — Test Play
            </button>

            {/* Recalibrate */}
            <button
              onClick={() => {
                if (!isCalibrated) return;
                try {
                  localStorage.removeItem(CALIBRATED_KEY);
                  localStorage.removeItem("webgazerGlobalData");
                  localStorage.removeItem("webgazerLocalModelData");
                } catch { /* ignore */ }
                markNavigated();
                router.push("/calibration?duration=120");
              }}
              disabled={!isCalibrated}
              className={`h-10 w-full rounded-full border text-sm font-medium transition-all duration-300 ${
                isCalibrated
                  ? "cursor-pointer border-eye-glow/30 bg-eye-glow/8 text-eye-glow/70 active:bg-eye-glow/18"
                  : "cursor-not-allowed border-white/4 bg-white/2 text-text-muted/20"
              }`}
            >
              Recalibrate
            </button>

            {/* Show Yellow Tracker */}
            <label className="flex w-full cursor-pointer items-center justify-between px-1 py-1">
              <span className="text-sm text-text-muted/60">Yellow Tracker</span>
              <div
                onClick={() => {
                  const next = !showTracker;
                  setShowTracker(next);
                  try {
                    if (next) {
                      localStorage.setItem(SHOW_TRACKER_KEY, "1");
                    } else {
                      localStorage.removeItem(SHOW_TRACKER_KEY);
                    }
                  } catch { /* ignore */ }
                }}
                className={`relative h-6 w-11 rounded-full transition-colors duration-300 ${
                  showTracker ? "bg-yellow-400/40" : "bg-white/10"
                }`}
              >
                <div
                  className={`absolute top-0.5 h-5 w-5 rounded-full transition-all duration-300 ${
                    showTracker
                      ? "left-[22px] bg-yellow-400"
                      : "left-0.5 bg-white/40"
                  }`}
                />
              </div>
            </label>
          </div>
        )}
      </div>

      <p className="absolute bottom-4 text-[10px] text-text-muted/30">v0.3.0</p>
    </div>
  );
}
