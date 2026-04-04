"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WebGazerScript from "@/components/WebGazerScript";
import { useWebGazer } from "@/lib/useWebGazer";
import { hasNavigated, markNavigated } from "@/lib/navigation";
import ScoreRing from "@/components/ScoreRing";

// 5-point calibration: center + 4 corners
const CALIBRATION_POINTS = [
  { x: 50, y: 50 },
  { x: 15, y: 15 },
  { x: 85, y: 15 },
  { x: 85, y: 85 },
  { x: 15, y: 85 },
];

// Validation points (different from calibration for meaningful testing)
const VALIDATION_POINTS = [
  { x: 30, y: 30 },
  { x: 70, y: 50 },
  { x: 50, y: 75 },
];

const DWELL_DURATION = 2000; // ms
const DWELL_RECORD_INTERVAL = 400; // ms — gives 5 samples per point

function CalibrationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duration = searchParams.get("duration") || "120";

  const {
    initialize,
    recordCalibrationPoint,
    setGazeListener,
    clearGazeListener,
    clearData,
    pause,
  } = useWebGazer();

  const [phase, setPhase] = useState<
    "permission" | "positioning" | "calibrating" | "validating" | "ready"
  >("permission");
  const [scriptReady, setScriptReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPoint, setCurrentPoint] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);

  // Dwell state
  const [dwellActive, setDwellActive] = useState(false);
  const [dwellProgress, setDwellProgress] = useState(0);
  const dwellStartRef = useRef(0);
  const dwellFrameRef = useRef(0);
  const dwellRecordCount = useRef(0);
  const dwellPointRef = useRef({ x: 0, y: 0 });

  // Validation state
  const [validationPoint, setValidationPoint] = useState(0);
  const [validationScore, setValidationScore] = useState<number | null>(null);
  const validationErrors = useRef<number[]>([]);
  const validationSamples = useRef<{ x: number; y: number }[]>([]);
  const validationTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

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
      // Preview is best-effort
    }
  }, []);

  // Callback ref for video elements
  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
    }
  }, []);

  // Stop camera preview stream
  const stopPreview = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Face detection during positioning — uses native FaceDetector if available, timer fallback
  useEffect(() => {
    if (phase !== "positioning") return;

    let cancelled = false;

    // Fallback: auto-ready after 3 seconds
    const fallbackTimer = setTimeout(() => {
      if (!cancelled) setFaceDetected(true);
    }, 3000);

    // Try native FaceDetector API (Chrome Android / desktop Chrome)
    if ("FaceDetector" in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).FaceDetector({ fastMode: true });
      let intervalId: ReturnType<typeof setInterval>;

      const check = async () => {
        if (cancelled || !videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const faces = await detector.detect(videoRef.current);
          if (!cancelled) {
            setFaceDetected(faces.length > 0);
            if (faces.length > 0) clearTimeout(fallbackTimer);
          }
        } catch {
          // detection failed — ignore
        }
      };

      intervalId = setInterval(check, 500);
      return () => {
        cancelled = true;
        clearTimeout(fallbackTimer);
        clearInterval(intervalId);
      };
    }

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
    };
  }, [phase]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearGazeListener();
      stopPreview();
      cancelAnimationFrame(dwellFrameRef.current);
      if (validationTimerRef.current) clearTimeout(validationTimerRef.current);
    };
  }, [clearGazeListener, stopPreview]);

  // ── Dwell timer loop ──
  useEffect(() => {
    if (!dwellActive) return;

    const loop = (now: number) => {
      const elapsed = now - dwellStartRef.current;
      const progress = Math.min(elapsed / DWELL_DURATION, 1);
      setDwellProgress(progress);

      // Record a sample at each interval
      const expectedRecords = Math.floor(elapsed / DWELL_RECORD_INTERVAL) + 1;
      while (dwellRecordCount.current < expectedRecords && dwellRecordCount.current < 5) {
        recordCalibrationPoint(dwellPointRef.current.x, dwellPointRef.current.y);
        dwellRecordCount.current++;
      }

      if (elapsed >= DWELL_DURATION) {
        // Dwell complete — advance
        setDwellActive(false);
        setDwellProgress(0);
        if (currentPoint < CALIBRATION_POINTS.length - 1) {
          setCurrentPoint((prev) => prev + 1);
        } else {
          // All points done — move to validation
          setPhase("validating");
          setValidationPoint(0);
          validationErrors.current = [];
        }
        return;
      }

      dwellFrameRef.current = requestAnimationFrame(loop);
    };

    dwellFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(dwellFrameRef.current);
  }, [dwellActive, currentPoint, recordCalibrationPoint]);

  // ── Validation phase ──
  useEffect(() => {
    if (phase !== "validating") return;
    if (validationPoint >= VALIDATION_POINTS.length) return;

    validationSamples.current = [];
    const vp = VALIDATION_POINTS[validationPoint];
    const targetX = (vp.x / 100) * window.innerWidth;
    const targetY = (vp.y / 100) * window.innerHeight;

    // Set gaze listener to collect samples
    setGazeListener((data) => {
      // Update cursor
      if (data && gazeCursorRef.current) {
        gazeCursorRef.current.style.left = `${data.x}px`;
        gazeCursorRef.current.style.top = `${data.y}px`;
      }
      if (data) {
        validationSamples.current.push({ x: data.x, y: data.y });
      }
    });

    // Wait 500ms settle, then collect for 1500ms
    const settleTimer = setTimeout(() => {
      validationSamples.current = []; // clear settle period samples

      const collectTimer = setTimeout(() => {
        // Compute error for this point
        const samples = validationSamples.current;
        if (samples.length > 0) {
          const avgX = samples.reduce((s, p) => s + p.x, 0) / samples.length;
          const avgY = samples.reduce((s, p) => s + p.y, 0) / samples.length;
          const dist = Math.sqrt((avgX - targetX) ** 2 + (avgY - targetY) ** 2);
          validationErrors.current.push(dist);
        } else {
          // No samples = worst case
          const maxDist = Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2) / 2;
          validationErrors.current.push(maxDist);
        }

        // Next point or finish
        if (validationPoint < VALIDATION_POINTS.length - 1) {
          setValidationPoint((p) => p + 1);
        } else {
          // Compute final score
          const avgError =
            validationErrors.current.reduce((a, b) => a + b, 0) /
            validationErrors.current.length;
          const maxDist = Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2) / 2;
          const score = Math.max(0, Math.round((1 - avgError / maxDist) * 100));
          setValidationScore(score);
          pause();
          setPhase("ready");
        }
      }, 1500);

      validationTimerRef.current = collectTimer;
    }, 500);

    validationTimerRef.current = settleTimer;

    return () => {
      if (validationTimerRef.current) clearTimeout(validationTimerRef.current);
    };
  }, [phase, validationPoint, setGazeListener, pause]);

  // Phase 1 → 2: Allow camera
  const handleAllowCamera = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await initialize();
      await startPreview();
      setPhase("positioning");
    } catch {
      setError(
        "Camera access is needed for eye tracking. Please allow camera access and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [initialize, startPreview]);

  // Phase 2 → 3: Start calibration
  const handleStartCalibration = useCallback(() => {
    stopPreview();
    setPhase("calibrating");
  }, [stopPreview]);

  // Calibration dot tap — starts dwell timer
  const handleDotTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (dwellActive) return; // already dwelling

      const point = CALIBRATION_POINTS[currentPoint];
      dwellPointRef.current = {
        x: (point.x / 100) * window.innerWidth,
        y: (point.y / 100) * window.innerHeight,
      };
      dwellRecordCount.current = 0;
      dwellStartRef.current = performance.now();
      setDwellActive(true);
    },
    [currentPoint, dwellActive]
  );

  // Recalibrate (from ready phase if score is low)
  const handleRecalibrate = useCallback(() => {
    clearData();
    setCurrentPoint(0);
    setDwellActive(false);
    setDwellProgress(0);
    setValidationScore(null);
    setValidationPoint(0);
    validationErrors.current = [];
    setPhase("calibrating");
  }, [clearData]);

  const handleStart = useCallback(() => {
    stopPreview();
    markNavigated();
    router.push(`/game?duration=${duration}`);
  }, [router, duration, stopPreview]);

  const showGazeCursor =
    phase === "calibrating" || phase === "validating" || phase === "ready";

  // SVG ring for dwell countdown
  const ringRadius = 26;
  const ringCircumference = 2 * Math.PI * ringRadius;

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
          <div className="relative mx-auto h-56 w-56 overflow-hidden rounded-3xl border-2 border-white/10 bg-black/40">
            <video
              ref={setVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full -scale-x-100 object-cover"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className={`h-40 w-28 rounded-full border-2 border-dashed transition-colors duration-500 ${
                  faceDetected ? "border-eye-glow/60" : "border-white/20"
                }`}
              />
            </div>
          </div>

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
            {faceDetected
              ? "Face detected — looking good!"
              : "Center your face in the oval"}
          </div>

          <div className="flex flex-col gap-1.5 text-xs leading-relaxed text-text-muted/60">
            <p>Hold upright at arm&apos;s length · Good lighting · No backlight</p>
          </div>

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

      {/* ── Phase 3: Calibration (5 points with dwell) ── */}
      {phase === "calibrating" && (
        <div className="fixed inset-0 z-20">
          <p className="absolute left-1/2 top-8 -translate-x-1/2 text-sm text-text-muted">
            Look at the dot and tap it — {currentPoint + 1} of{" "}
            {CALIBRATION_POINTS.length}
          </p>

          {/* Progress bar */}
          <div className="absolute left-6 right-6 top-16 h-1 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-eye-glow/40 transition-all duration-500 ease-out"
              style={{
                width: `${((currentPoint + (dwellActive ? dwellProgress : 0)) / CALIBRATION_POINTS.length) * 100}%`,
              }}
            />
          </div>

          {CALIBRATION_POINTS.map((point, i) => (
            <button
              key={`cal-${i}-${currentPoint}`}
              onClick={i === currentPoint && !dwellActive ? handleDotTap : undefined}
              onTouchEnd={i === currentPoint && !dwellActive ? handleDotTap : undefined}
              className={`absolute h-14 w-14 rounded-full transition-all duration-500 ease-in-out ${
                i === currentPoint
                  ? dwellActive
                    ? "animate-calibration-pulse opacity-100"
                    : "animate-calibration-appear glow-eye opacity-100"
                  : i < currentPoint
                    ? "bg-eye-glow/15 opacity-40"
                    : "bg-white/5 opacity-20"
              }`}
              style={{
                left: `${point.x}%`,
                top: `${point.y}%`,
                transform:
                  i !== currentPoint
                    ? `translate(-50%, -50%) scale(0.5)`
                    : undefined,
                background:
                  i === currentPoint
                    ? "radial-gradient(circle, #5eead4 0%, rgba(94, 234, 212, 0.3) 60%, transparent 100%)"
                    : undefined,
                cursor: i === currentPoint && !dwellActive ? "pointer" : "default",
              }}
              aria-label={`Calibration point ${i + 1}`}
            >
              {/* Dwell countdown ring */}
              {dwellActive && i === currentPoint && (
                <svg
                  className="pointer-events-none absolute inset-0"
                  viewBox="0 0 56 56"
                >
                  <circle
                    cx="28"
                    cy="28"
                    r={ringRadius}
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r={ringRadius}
                    fill="none"
                    stroke="#5eead4"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={(1 - dwellProgress) * ringCircumference}
                    className="-rotate-90 origin-center"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Phase 4: Validation ── */}
      {phase === "validating" && (
        <div className="fixed inset-0 z-20">
          <p className="absolute left-1/2 top-8 -translate-x-1/2 text-sm text-text-muted">
            Look at the dot — verifying accuracy {validationPoint + 1} of{" "}
            {VALIDATION_POINTS.length}
          </p>

          {/* Progress bar */}
          <div className="absolute left-6 right-6 top-16 h-1 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-eye-glow/40 transition-all duration-500 ease-out"
              style={{
                width: `${(validationPoint / VALIDATION_POINTS.length) * 100}%`,
              }}
            />
          </div>

          {/* Current validation dot */}
          {validationPoint < VALIDATION_POINTS.length && (
            <div
              key={`val-${validationPoint}`}
              className="animate-calibration-appear absolute h-12 w-12 rounded-full animate-calibration-pulse"
              style={{
                left: `${VALIDATION_POINTS[validationPoint].x}%`,
                top: `${VALIDATION_POINTS[validationPoint].y}%`,
                background:
                  "radial-gradient(circle, #99f6e4 0%, rgba(153, 246, 228, 0.3) 60%, transparent 100%)",
                boxShadow: "0 0 24px 8px rgba(153, 246, 228, 0.25)",
              }}
            />
          )}
        </div>
      )}

      {/* ── Phase 5: Ready ── */}
      {phase === "ready" && (
        <div className="flex flex-col items-center gap-6 text-center">
          {validationScore !== null ? (
            <>
              <ScoreRing
                score={validationScore}
                size={140}
                strokeWidth={5}
                color={validationScore >= 50 ? "#5eead4" : "#fca5a1"}
                label="Calibration Accuracy"
              />

              {validationScore < 50 && (
                <p className="max-w-xs text-sm text-touch-glow/70">
                  Accuracy is low. Try recalibrating with better lighting and a steady position.
                </p>
              )}
            </>
          ) : (
            <>
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
            </>
          )}

          <button
            onClick={handleStart}
            className="mt-2 h-14 w-52 cursor-pointer rounded-full border border-eye-glow/50 bg-eye-glow/18 text-lg font-semibold text-eye-glow shadow-[0_0_24px_6px_rgba(94,234,212,0.12)] transition-all duration-500 ease-in-out"
          >
            Start Session
          </button>

          {validationScore !== null && validationScore < 50 && (
            <button
              onClick={handleRecalibrate}
              className="cursor-pointer text-sm text-touch-glow/60 transition-colors duration-300 hover:text-touch-glow"
            >
              Recalibrate
            </button>
          )}

          <button
            onClick={handleStart}
            className="cursor-pointer text-sm text-text-muted/40 transition-colors duration-300 hover:text-text-primary"
          >
            Skip — start anyway
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
