"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WebGazerScript from "@/components/WebGazerScript";
import { useWebGazer } from "@/lib/useWebGazer";

const CALIBRATION_POINTS = [
  { x: 50, y: 50 },
  { x: 10, y: 15 },
  { x: 90, y: 15 },
  { x: 10, y: 85 },
  { x: 90, y: 85 },
];

function CalibrationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duration = searchParams.get("duration") || "120";

  const { initialize, recordCalibrationPoint, pause } = useWebGazer();

  const [phase, setPhase] = useState<"permission" | "calibrating" | "ready">(
    "permission"
  );
  const [scriptReady, setScriptReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPoint, setCurrentPoint] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleStartCalibration = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await initialize();
      setPhase("calibrating");
    } catch {
      setError(
        "Camera access is needed for eye tracking. Please allow camera access and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [initialize]);

  const handleDotTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const point = CALIBRATION_POINTS[currentPoint];
      const x = (point.x / 100) * window.innerWidth;
      const y = (point.y / 100) * window.innerHeight;

      for (let i = 0; i < 5; i++) {
        recordCalibrationPoint(x, y);
      }

      if (currentPoint < CALIBRATION_POINTS.length - 1) {
        setCurrentPoint((prev) => prev + 1);
      } else {
        pause();
        setPhase("ready");
      }
    },
    [currentPoint, recordCalibrationPoint, pause]
  );

  const handleStart = useCallback(() => {
    router.push(`/game?duration=${duration}`);
  }, [router, duration]);

  useEffect(() => {
    return () => {};
  }, []);

  return (
    <div className="animate-fade-in flex min-h-dvh flex-col items-center justify-center px-6">
      <WebGazerScript onReady={() => setScriptReady(true)} />

      {phase === "permission" && (
        <div className="flex max-w-sm flex-col items-center gap-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-eye-glow/10">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-eye-glow"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>

          <h2 className="text-2xl font-semibold text-text-primary">
            Eye Tracking Setup
          </h2>

          <p className="text-base leading-relaxed text-text-muted">
            We use your camera to track your eyes during the session. Nothing is
            recorded or stored.
          </p>

          {error && <p className="text-sm text-touch-glow/80">{error}</p>}

          <button
            onClick={handleStartCalibration}
            disabled={!scriptReady || loading}
            className={`mt-4 h-14 w-52 cursor-pointer rounded-full border text-lg font-semibold transition-all duration-500 ease-in-out ${
              scriptReady && !loading
                ? "border-eye-glow/50 bg-eye-glow/18 text-eye-glow"
                : "border-white/6 bg-white/3 text-text-primary/25 opacity-50"
            }`}
          >
            {loading
              ? "Starting camera..."
              : !scriptReady
                ? "Loading..."
                : "Allow Camera"}
          </button>

          <button
            onClick={handleStart}
            className="mt-4 cursor-pointer text-sm text-text-muted transition-colors duration-300 hover:text-text-primary"
          >
            Skip — play without eye tracking
          </button>

          <button
            onClick={() => router.push("/")}
            className="mt-2 cursor-pointer text-sm text-text-muted/50 transition-colors duration-300 hover:text-text-primary"
          >
            ← Back
          </button>
        </div>
      )}

      {phase === "calibrating" && (
        <div className="fixed inset-0 z-20">
          <p className="absolute left-1/2 top-8 -translate-x-1/2 text-sm text-text-muted">
            Look at the dot and tap it — {currentPoint + 1} of{" "}
            {CALIBRATION_POINTS.length}
          </p>

          {CALIBRATION_POINTS.map((point, i) => (
            <button
              key={i}
              onClick={i === currentPoint ? handleDotTap : undefined}
              onTouchEnd={i === currentPoint ? handleDotTap : undefined}
              className={`absolute h-14 w-14 cursor-pointer rounded-full transition-all duration-500 ease-in-out ${
                i === currentPoint
                  ? "glow-eye opacity-100 scale-100"
                  : i < currentPoint
                    ? "bg-eye-glow/15 opacity-40 scale-60"
                    : "bg-white/5 opacity-20 scale-60"
              }`}
              style={{
                left: `${point.x}%`,
                top: `${point.y}%`,
                transform: `translate(-50%, -50%) scale(${i === currentPoint ? 1 : 0.6})`,
                background:
                  i === currentPoint
                    ? "radial-gradient(circle, #5eead4 0%, rgba(94, 234, 212, 0.3) 60%, transparent 100%)"
                    : undefined,
              }}
              aria-label={`Calibration point ${i + 1}`}
            />
          ))}
        </div>
      )}

      {phase === "ready" && (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-eye-glow/10">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-eye-glow"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>

          <h2 className="text-2xl font-semibold text-text-primary">
            Calibration Complete
          </h2>

          <p className="text-base text-text-muted">
            You&apos;re all set. Take a breath and begin.
          </p>

          <button
            onClick={handleStart}
            className="mt-4 h-14 w-52 cursor-pointer rounded-full border border-eye-glow/50 bg-eye-glow/18 text-lg font-semibold text-eye-glow shadow-[0_0_24px_6px_rgba(94,234,212,0.12)] transition-all duration-500 ease-in-out"
          >
            Start Session
          </button>
        </div>
      )}
    </div>
  );
}

export default function CalibrationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <p className="text-text-muted">Loading...</p>
        </div>
      }
    >
      <CalibrationContent />
    </Suspense>
  );
}
