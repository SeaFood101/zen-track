"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ScoreRing from "@/components/ScoreRing";
import { saveSession } from "@/lib/storage";

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const savedRef = useRef(false);

  const eye = parseFloat(searchParams.get("eye") || "0");
  const touch = parseFloat(searchParams.get("touch") || "0");
  const combined = parseFloat(searchParams.get("combined") || "0");
  const duration = parseInt(searchParams.get("duration") || "120", 10);

  // Save session once
  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;

    saveSession({
      duration,
      eyeAccuracy: eye,
      touchAccuracy: touch,
      combinedAccuracy: combined,
    });
  }, [duration, eye, touch, combined]);

  return (
    <div className="animate-fade-in flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <h2 className="mb-10 text-2xl font-semibold text-text-primary">
        Session Complete
      </h2>

      <ScoreRing score={combined} label="Combined" />

      <div className="mt-10 flex w-full max-w-xs gap-4">
        {/* Eye accuracy card */}
        <div className="flex flex-1 flex-col items-center gap-2 rounded-2xl bg-eye-glow/6 p-5">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5eead4"
            strokeWidth="1.5"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className="text-2xl font-semibold text-eye-glow tabular-nums">
            {Math.round(eye)}%
          </span>
          <span className="text-xs text-text-muted">Eye</span>
        </div>

        {/* Touch accuracy card */}
        <div className="flex flex-1 flex-col items-center gap-2 rounded-2xl bg-touch-glow/6 p-5">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fca5a1"
            strokeWidth="1.5"
          >
            <path d="M18 11V6a2 2 0 0 0-4 0v1M14 11V4a2 2 0 0 0-4 0v7M10 10.5V6a2 2 0 0 0-4 0v8" />
            <path d="M18 11a2 2 0 0 1 4 0v3a8 8 0 0 1-8 8h-2c-4.4 0-8-3.6-8-8v-1a2 2 0 0 1 4 0" />
          </svg>
          <span className="text-2xl font-semibold text-touch-glow tabular-nums">
            {Math.round(touch)}%
          </span>
          <span className="text-xs text-text-muted">Touch</span>
        </div>
      </div>

      <div className="mt-12 flex w-full max-w-xs flex-col items-center gap-3">
        <button
          onClick={() => router.push("/")}
          className="h-14 w-full cursor-pointer rounded-full border border-eye-glow/50 bg-eye-glow/18 text-lg font-semibold text-eye-glow shadow-[0_0_24px_6px_rgba(94,234,212,0.12)] transition-all duration-500 ease-in-out"
        >
          Play Again
        </button>

        <button
          onClick={() => router.push("/history")}
          className="h-12 w-full cursor-pointer rounded-full border border-white/8 bg-white/4 text-base font-medium text-text-muted transition-all duration-300 hover:text-text-primary"
        >
          View History
        </button>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <p className="text-text-muted">Loading...</p>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
