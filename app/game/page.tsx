"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Ball from "@/components/Ball";
import Timer from "@/components/Timer";
import WebGazerScript from "@/components/WebGazerScript";
import { useWebGazer } from "@/lib/useWebGazer";
import { getEyeBallPosition, getTouchBallPosition } from "@/lib/ballPaths";
import {
  calculateAccuracy,
  getMaxDistance,
  RunningAverage,
  Point,
} from "@/lib/scoring";

function GameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalDuration = parseInt(searchParams.get("duration") || "120", 10);

  const { resume, setGazeListener, clearGazeListener, pause } = useWebGazer();

  // Phase: countdown → playing → done
  const [phase, setPhase] = useState<"countdown" | "playing" | "done">(
    "countdown"
  );
  const [countdown, setCountdown] = useState(3);
  const [secondsLeft, setSecondsLeft] = useState(totalDuration);
  const [eyeGlow, setEyeGlow] = useState<"dim" | "normal" | "bright">(
    "normal"
  );
  const [touchGlow, setTouchGlow] = useState<"dim" | "normal" | "bright">(
    "normal"
  );
  const [scriptReady, setScriptReady] = useState(false);
  const [adminMode, setAdminMode] = useState(false);

  // DOM refs for imperative position updates
  const eyeBallRef = useRef<HTMLDivElement>(null);
  const touchBallRef = useRef<HTMLDivElement>(null);
  const gazeCursorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Position refs (updated in rAF, read by scoring)
  const eyeBallPos = useRef<Point>({ x: 0, y: 0 });
  const touchBallPos = useRef<Point>({ x: 0, y: 0 });
  const gazePos = useRef<Point | null>(null);
  const touchPos = useRef<Point | null>(null);

  // Scoring
  const eyeAvg = useRef(new RunningAverage());
  const touchAvg = useRef(new RunningAverage());
  const animFrameRef = useRef<number>(0);
  const lastSampleTime = useRef(0);
  const gameStartTime = useRef(0);

  // Countdown phase
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("playing");
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  // Start game loop when playing
  useEffect(() => {
    if (phase !== "playing") return;

    gameStartTime.current = performance.now();
    lastSampleTime.current = performance.now();

    // Resume WebGazer and set gaze listener
    if (scriptReady) {
      resume().then(() => {
        setGazeListener((data) => {
          if (data) {
            gazePos.current = { x: data.x, y: data.y };
            if (gazeCursorRef.current) {
              gazeCursorRef.current.style.left = `${data.x}px`;
              gazeCursorRef.current.style.top = `${data.y}px`;
            }
          }
        });
      });
    }

    const loop = (now: number) => {
      const elapsed = (now - gameStartTime.current) / 1000;
      const remaining = Math.max(0, totalDuration - elapsed);
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Update ball positions imperatively
      const eyeP = getEyeBallPosition(elapsed, w, h);
      const touchP = getTouchBallPosition(elapsed, w, h);
      eyeBallPos.current = eyeP;
      touchBallPos.current = touchP;

      if (eyeBallRef.current) {
        eyeBallRef.current.style.left = `${eyeP.x}px`;
        eyeBallRef.current.style.top = `${eyeP.y}px`;
      }
      if (touchBallRef.current) {
        touchBallRef.current.style.left = `${touchP.x}px`;
        touchBallRef.current.style.top = `${touchP.y}px`;
      }

      // Sample accuracy every 100ms
      if (now - lastSampleTime.current >= 100) {
        lastSampleTime.current = now;
        const maxDist = getMaxDistance();

        // Eye accuracy
        if (gazePos.current) {
          const eyeAcc = calculateAccuracy(
            gazePos.current,
            eyeBallPos.current,
            maxDist
          );
          eyeAvg.current.add(eyeAcc);

          if (eyeAcc > 70) setEyeGlow("bright");
          else if (eyeAcc < 40) setEyeGlow("dim");
          else setEyeGlow("normal");
        }

        // Touch accuracy
        if (touchPos.current) {
          const touchAcc = calculateAccuracy(
            touchPos.current,
            touchBallPos.current,
            maxDist
          );
          touchAvg.current.add(touchAcc);

          if (touchAcc > 70) setTouchGlow("bright");
          else if (touchAcc < 40) setTouchGlow("dim");
          else setTouchGlow("normal");
        } else {
          touchAvg.current.add(0);
          setTouchGlow("dim");
        }
      }

      // Update timer display (~1/sec)
      const newSecondsLeft = Math.ceil(remaining);
      setSecondsLeft(newSecondsLeft);

      if (remaining <= 0) {
        setPhase("done");
        return;
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      clearGazeListener();
    };
  }, [
    phase,
    totalDuration,
    scriptReady,
    resume,
    setGazeListener,
    clearGazeListener,
  ]);

  // Navigate to results when done
  useEffect(() => {
    if (phase !== "done") return;

    pause();

    const eye = Math.round(eyeAvg.current.average * 10) / 10;
    const touch = Math.round(touchAvg.current.average * 10) / 10;
    const combined = Math.round(((eye + touch) / 2) * 10) / 10;

    router.push(
      `/results?eye=${eye}&touch=${touch}&combined=${combined}&duration=${totalDuration}`
    );
  }, [phase, router, totalDuration, pause]);

  // Admin mode toggle (press A on desktop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "a" || e.key === "A") {
        setAdminMode((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Admin mode toggle via triple-tap on timer (mobile)
  const handleAdminTripleTap = useCallback(() => {
    setAdminMode((prev) => !prev);
  }, []);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    touchPos.current = { x: t.clientX, y: t.clientY };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    touchPos.current = { x: t.clientX, y: t.clientY };
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchPos.current = null;
  }, []);

  // Mouse fallback for desktop testing
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    touchPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    touchPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback(() => {
    touchPos.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 select-none"
      style={{ touchAction: "none" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <WebGazerScript onReady={() => setScriptReady(true)} />

      {/* Countdown overlay */}
      {phase === "countdown" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <span
            key={countdown}
            className="animate-fade-in text-7xl font-light text-text-primary/40"
          >
            {countdown > 0 ? countdown : ""}
          </span>
        </div>
      )}

      {/* Game elements */}
      {phase === "playing" && (
        <>
          <Timer
            secondsLeft={secondsLeft}
            onTripleTap={handleAdminTripleTap}
          />

          {/* Split-screen divider */}
          <div className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-px">
            <div className="mx-auto h-px w-full bg-gradient-to-r from-transparent via-white/8 to-transparent" />
          </div>

          {/* Zone labels */}
          <div className="pointer-events-none absolute left-4 top-1/2 z-20 -translate-y-8 text-[10px] font-medium uppercase tracking-widest text-eye-glow/20">
            Eye tracking
          </div>
          <div className="pointer-events-none absolute left-4 top-1/2 z-20 translate-y-3 text-[10px] font-medium uppercase tracking-widest text-touch-glow/20">
            Touch tracking
          </div>

          {/* Balls */}
          <Ball ref={eyeBallRef} variant="eye" glowLevel={eyeGlow} />
          <Ball ref={touchBallRef} variant="touch" glowLevel={touchGlow} />

          {/* Admin mode: gaze cursor */}
          {adminMode && (
            <div
              ref={gazeCursorRef}
              className="pointer-events-none absolute z-50 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-yellow-400/80 bg-yellow-400/20"
              style={{ willChange: "left, top" }}
            />
          )}

          {/* Admin mode: label */}
          {adminMode && (
            <div className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-yellow-400/10 px-3 py-1 text-xs text-yellow-400/70">
              Admin — Gaze Cursor ON (triple-tap timer to toggle)
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <p className="text-text-muted">Loading...</p>
        </div>
      }
    >
      <GameContent />
    </Suspense>
  );
}
