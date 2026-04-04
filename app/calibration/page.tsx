"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WebGazerScript from "@/components/WebGazerScript";
import { useWebGazer } from "@/lib/useWebGazer";
import { hasNavigated, markNavigated } from "@/lib/navigation";

// 9-point grid: 3×3 at 12%, 50%, 88%
const CALIBRATION_POINTS = [
  { x: 50, y: 50 },
  { x: 12, y: 12 },
  { x: 50, y: 12 },
  { x: 88, y: 12 },
  { x: 88, y: 50 },
  { x: 88, y: 88 },
  { x: 50, y: 88 },
  { x: 12, y: 88 },
  { x: 12, y: 50 },
];

function CalibrationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duration = searchParams.get("duration") || "120";

  const {
    initialize,
    recordCalibrationPoint,
    setGazeListener,
    clearGazeListener,
    pause,
  } = useWebGazer();

  const [phase, setPhase] = useState<
    "permission" | "positioning" | "calibrating" | "ready"
  >("permission");
  const [scriptReady, setScriptReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPoint, setCurrentPoint] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);

  // Redirect to home on refresh / direct URL access
  useEffect(() => {
    if (!hasNavigated()) {
      router.replace("/");
    }
  }, [router]);

  // Refs
  const gazeCursorRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionCount = useRef(0);

  // Start camera preview stream
  const startPreview = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      // Preview is best-effort — WebGazer has its own stream
    }
  }, []);

  // Stop camera preview stream
  const stopPreview = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearGazeListener();
      stopPreview();
    };
  }, [clearGazeListener, stopPreview]);

  // Phase 1 → 2: Allow camera, go to positioning with live preview
  const handleAllowCamera = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await initialize();
      // Start gaze listener for face detection + yellow cursor
      setGazeListener((data) => {
        if (data && gazeCursorRef.current) {
          gazeCursorRef.current.style.left = `${data.x}px`;
          gazeCursorRef.current.style.top = `${data.y}px`;
          gazeCursorRef.current.style.opacity = "1";
        }
        if (data) {
          detectionCount.current++;
          if (detectionCount.current >= 5) setFaceDetected(true);
        } else {
          detectionCount.current = 0;
          setFaceDetected(false);
        }
      });
      // Start our preview stream
      await startPreview();
      setPhase("positioning");
    } catch {
      setError(
        "Camera access is needed for eye tracking. Please allow camera access and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [initialize, setGazeListener, startPreview]);

  // Phase 2 → 3: Start calibration
  const handleStartCalibration = useCallback(() => {
    setPhase("calibrating");
  }, []);

  // Calibration dot tap
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
        stopPreview();
        setPhase("ready");
      }
    },
    [currentPoint, recordCalibrationPoint, pause, stopPreview]
  );

  const handleStart = useCallback(() => {
    stopPreview();
    markNavigated();
    router.push(`/game?duration=${duration}`);
  }, [router, duration, stopPreview]);

  const showGazeCursor =
    phase === "positioning" || phase === "calibrating" || phase === "ready";

  return (
    <div className="animate-fade-in flex min-h-dvh flex-col items-center justify-center px-6">
      <WebGazerScript onReady={() => setScriptReady(true)} />

      {/* ── Phase 1: Camera Permission ── */}
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
            onClick={handleAllowCamera}
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

      {/* ── Gaze cursor ── */}
      {showGazeCursor && (
        <div
          ref={gazeCursorRef}
          className="pointer-events-none fixed z-50 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-yellow-400/80 bg-yellow-400/25 opacity-0 transition-opacity duration-300"
          style={{ willChange: "left, top" }}
        />
      )}

      {/* ── Phase 2: Positioning — Live Camera Mirror ── */}
      {phase === "positioning" && (
        <div className="flex w-full max-w-xs flex-col items-center gap-5 text-center">
          {/* Camera preview */}
          <div className="relative mx-auto h-56 w-56 overflow-hidden rounded-3xl border-2 border-white/10 bg-black/40">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full -scale-x-100 object-cover"
            />
            {/* Face guide oval */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className={`h-40 w-28 rounded-full border-2 border-dashed transition-colors duration-500 ${
                  faceDetected ? "border-eye-glow/60" : "border-white/20"
                }`}
              />
            </div>
          </div>

          {/* Face detection status */}
          <div
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-500 ${
              faceDetected
                ? "bg-eye-glow/10 text-eye-glow"
                : "bg-white/5 text-text-muted/60"
            }`}
          >
            <div
              className={`h-2 w-2 rounded-full transition-colors duration-500 ${
                faceDetected ? "bg-eye-glow animate-pulse" : "bg-text-muted/30"
              }`}
            />
            {faceDetected ? "Face detected — looking good!" : "Align your face in the oval"}
          </div>

          <div className="flex flex-col gap-1.5 text-xs leading-relaxed text-text-muted/60">
            <p>Hold upright at arm&apos;s length · Good lighting · No backlight</p>
          </div>

          {/* Always tappable — face detection is just a hint */}
          <button
            onClick={handleStartCalibration}
            className={`mt-1 h-14 w-52 cursor-pointer rounded-full border text-lg font-semibold transition-all duration-500 ease-in-out ${
              faceDetected
                ? "border-eye-glow/50 bg-eye-glow/18 text-eye-glow shadow-[0_0_24px_6px_rgba(94,234,212,0.12)]"
                : "border-white/12 bg-white/6 text-text-primary/50"
            }`}
          >
            Start Calibration
          </button>

          <button
            onClick={handleStart}
            className="cursor-pointer text-sm text-text-muted/40 transition-colors duration-300 hover:text-text-primary"
          >
            Skip calibration
          </button>
        </div>
      )}

      {/* ── Phase 3: Calibration (9 points) ── */}
      {phase === "calibrating" && (
        <div className="fixed inset-0 z-20">
          {/* Small camera thumbnail */}
          <div className="absolute right-4 top-4 z-30 h-20 w-28 overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-lg">
            <video
              ref={(el) => {
                // Reuse the same stream for the thumbnail
                if (el && streamRef.current) {
                  el.srcObject = streamRef.current;
                }
              }}
              autoPlay
              playsInline
              muted
              className="h-full w-full -scale-x-100 object-cover"
            />
          </div>

          <p className="absolute left-1/2 top-8 -translate-x-1/2 text-sm text-text-muted">
            Look at the dot and tap it — {currentPoint + 1} of{" "}
            {CALIBRATION_POINTS.length}
          </p>

          {/* Progress bar */}
          <div className="absolute left-6 right-6 top-16 h-1 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-eye-glow/40 transition-all duration-500 ease-out"
              style={{
                width: `${(currentPoint / CALIBRATION_POINTS.length) * 100}%`,
              }}
            />
          </div>

          {CALIBRATION_POINTS.map((point, i) => (
            <button
              key={i}
              onClick={i === currentPoint ? handleDotTap : undefined}
              onTouchEnd={i === currentPoint ? handleDotTap : undefined}
              className={`absolute h-14 w-14 cursor-pointer rounded-full transition-all duration-500 ease-in-out ${
                i === currentPoint
                  ? "glow-eye opacity-100"
                  : i < currentPoint
                    ? "bg-eye-glow/15 opacity-40"
                    : "bg-white/5 opacity-20"
              }`}
              style={{
                left: `${point.x}%`,
                top: `${point.y}%`,
                transform: `translate(-50%, -50%) scale(${i === currentPoint ? 1 : 0.5})`,
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

      {/* ── Phase 4: Ready ── */}
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
            The yellow dot should follow your eyes.
            <br />
            Look around to verify, then begin.
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
