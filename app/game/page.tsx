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
import { hasNavigated, markNavigated } from "@/lib/navigation";

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
  const nullGazeCount = useRef(0); // consecutive null readings from WebGazer

  // Eye tracking grace period: tolerate blinks/noise for 1s before penalizing
  const eyeOutOfRangeStart = useRef<number | null>(null); // timestamp when gaze left ball radius
  const eyeDimming = useRef(false); // whether we've started dimming after grace period

  // Background color feedback — only shift after 3s sustained distraction
  const bgLevel = useRef(0.5);
  const distractionStart = useRef<number | null>(null); // timestamp when distraction began
  const isDistracted = useRef(false); // whether 3s threshold has been crossed

  // Haptic feedback
  const lastHapticTime = useRef(0);

  // Trail
  const trailCanvasRef = useRef<HTMLCanvasElement>(null);
  const eyeTrail = useRef<{ x: number; y: number }[]>([]);
  const touchTrail = useRef<{ x: number; y: number }[]>([]);

  // Redirect to home on refresh / direct URL access
  useEffect(() => {
    if (!hasNavigated()) {
      router.replace("/");
    }
  }, [router]);

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

    // Size trail canvas
    const canvas = trailCanvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    // Resume WebGazer and set gaze listener
    if (scriptReady) {
      resume().then(() => {
        setGazeListener((data) => {
          if (data) {
            gazePos.current = { x: data.x, y: data.y };
            nullGazeCount.current = 0;
            if (gazeCursorRef.current) {
              gazeCursorRef.current.style.left = `${data.x}px`;
              gazeCursorRef.current.style.top = `${data.y}px`;
            }
          } else {
            nullGazeCount.current++;
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

      // Magnetic pull: attract gaze toward eye ball when close
      if (gazePos.current) {
        const dx = eyeP.x - gazePos.current.x;
        const dy = eyeP.y - gazePos.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const magnetRadius = 150;
        if (dist < magnetRadius && dist > 0) {
          const pull = Math.pow(1 - dist / magnetRadius, 2) * 0.35;
          gazePos.current = {
            x: gazePos.current.x + dx * pull,
            y: gazePos.current.y + dy * pull,
          };
          if (gazeCursorRef.current) {
            gazeCursorRef.current.style.left = `${gazePos.current.x}px`;
            gazeCursorRef.current.style.top = `${gazePos.current.y}px`;
          }
        }
      }

      // Trail: record positions and draw fading ghosts
      eyeTrail.current.push({ x: eyeP.x, y: eyeP.y });
      touchTrail.current.push({ x: touchP.x, y: touchP.y });
      const maxTrail = 30;
      if (eyeTrail.current.length > maxTrail) eyeTrail.current.shift();
      if (touchTrail.current.length > maxTrail) touchTrail.current.shift();

      const ctx = trailCanvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        for (let i = 0; i < eyeTrail.current.length; i++) {
          const p = eyeTrail.current[i];
          const t = i / eyeTrail.current.length;
          const radius = 25 * (0.2 + 0.8 * t);
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(94, 234, 212, ${t * 0.25})`;
          ctx.fill();
        }
        for (let i = 0; i < touchTrail.current.length; i++) {
          const p = touchTrail.current[i];
          const t = i / touchTrail.current.length;
          const radius = 25 * (0.2 + 0.8 * t);
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(252, 165, 161, ${t * 0.25})`;
          ctx.fill();
        }
      }

      // Sample accuracy every 100ms
      if (now - lastSampleTime.current >= 100) {
        lastSampleTime.current = now;
        const maxDist = getMaxDistance();

        // --- Eye accuracy with 1s grace period for blinks ---
        let currentEyeAcc = 0;
        if (gazePos.current) {
          currentEyeAcc = calculateAccuracy(
            gazePos.current,
            eyeBallPos.current,
            maxDist
          );

          if (currentEyeAcc > 30) {
            // Gaze is near the ball — reset grace timer, user is focused
            eyeOutOfRangeStart.current = null;
            eyeDimming.current = false;
            eyeAvg.current.add(currentEyeAcc);
            setEyeGlow(currentEyeAcc > 70 ? "bright" : "normal");
          } else {
            // Gaze is far from ball — could be a blink or real distraction
            if (eyeOutOfRangeStart.current === null) {
              eyeOutOfRangeStart.current = now;
            }
            const eyeAbsentDuration = now - eyeOutOfRangeStart.current;

            if (eyeAbsentDuration < 1000) {
              // Within grace period: keep last glow, don't penalize score
              // (assume blink — don't add sample at all)
            } else {
              // Past grace period: start dimming gradually and penalize
              eyeDimming.current = true;
              eyeAvg.current.add(currentEyeAcc);
              setEyeGlow("dim");
            }
          }
        } else {
          // No gaze data at all (WebGazer lost face)
          if (eyeOutOfRangeStart.current === null) {
            eyeOutOfRangeStart.current = now;
          }
          const eyeAbsentDuration = now - eyeOutOfRangeStart.current;
          if (eyeAbsentDuration >= 1000) {
            eyeDimming.current = true;
            setEyeGlow("dim");
          }
        }

        // --- Touch accuracy: real-time as before ---
        let currentTouchAcc = 0;
        if (touchPos.current) {
          currentTouchAcc = calculateAccuracy(
            touchPos.current,
            touchBallPos.current,
            maxDist
          );
          touchAvg.current.add(currentTouchAcc);

          if (currentTouchAcc > 70) setTouchGlow("bright");
          else if (currentTouchAcc < 40) setTouchGlow("dim");
          else setTouchGlow("normal");
        } else {
          touchAvg.current.add(0);
          setTouchGlow("dim");
        }

        // --- Background color: only shift after 3s sustained distraction ---
        const combined = (currentEyeAcc + currentTouchAcc) / 200; // 0=bad, 1=good
        const distractionThreshold = 0.35; // below this = "distracted"

        if (combined < distractionThreshold) {
          // User seems distracted — start or continue tracking
          if (distractionStart.current === null) {
            distractionStart.current = now;
          }
          const distractedFor = now - distractionStart.current;
          if (distractedFor >= 3000) {
            // Been distracted for 3s+ — slowly shift background
            isDistracted.current = true;
            bgLevel.current += (combined - bgLevel.current) * 0.02; // very slow shift
          }
          // Otherwise: within 3s grace — don't change background
        } else {
          // User is focused — reset distraction timer, slowly return to calm
          distractionStart.current = null;
          if (isDistracted.current) {
            // Fade back to calm slowly
            bgLevel.current += (0.5 - bgLevel.current) * 0.015;
            if (bgLevel.current >= 0.48) {
              isDistracted.current = false;
            }
          }
        }

        if (containerRef.current) {
          const f = bgLevel.current;
          const r = Math.round(10 + 51 * (1 - f));
          const g = Math.round(61 * f + 18 * (1 - f));
          const b = Math.round(61 * f + 8 * (1 - f));
          containerRef.current.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        }

        // Haptic nudge only during sustained distraction (after 3s), 5s cooldown
        if (isDistracted.current && now - lastHapticTime.current > 5000) {
          lastHapticTime.current = now;
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate(50);
          }
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

    markNavigated();
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
      {/* Trail canvas */}
      <canvas
        ref={trailCanvasRef}
        className="pointer-events-none absolute inset-0 z-[1]"
      />

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
