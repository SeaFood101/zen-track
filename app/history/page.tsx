"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import SessionCard from "@/components/SessionCard";
import { getSessions, clearSessions, Session } from "@/lib/storage";

const AccuracyChart = dynamic(() => import("@/components/AccuracyChart"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[220px] items-center justify-center">
      <p className="text-sm text-text-muted">Loading chart...</p>
    </div>
  ),
});

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [detailed, setDetailed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const reversed = [...sessions].reverse();

  const handleClear = () => {
    clearSessions();
    setSessions([]);
    setShowConfirm(false);
  };

  return (
    <div className="animate-fade-in mx-auto flex min-h-dvh max-w-md flex-col px-6 py-8">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-text-muted transition-colors duration-300 hover:text-text-primary"
        >
          ← Home
        </Link>
        <h2 className="text-xl font-semibold text-text-primary">
          Your Sessions
        </h2>
        <div className="w-12" />
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <p className="text-base text-text-muted">No sessions yet.</p>
          <Link
            href="/"
            className="text-sm text-eye-glow transition-opacity duration-300 hover:opacity-80"
          >
            Play your first game →
          </Link>
        </div>
      ) : (
        <>
          {/* Chart */}
          {sessions.length >= 2 && (
            <div className="mt-8">
              <div className="mb-4 flex justify-center">
                <div className="flex rounded-full border border-white/6 bg-white/4 p-0.5">
                  <button
                    onClick={() => setDetailed(false)}
                    className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-300 ${
                      !detailed
                        ? "bg-eye-glow/15 text-eye-glow"
                        : "text-text-muted"
                    }`}
                  >
                    Combined
                  </button>
                  <button
                    onClick={() => setDetailed(true)}
                    className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-300 ${
                      detailed
                        ? "bg-eye-glow/15 text-eye-glow"
                        : "text-text-muted"
                    }`}
                  >
                    Detailed
                  </button>
                </div>
              </div>

              <AccuracyChart sessions={sessions} detailed={detailed} />
            </div>
          )}

          {/* Session list */}
          <div className="mt-8 flex flex-col gap-3">
            {reversed.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>

          {/* Clear history */}
          <div className="mt-8 flex justify-center pb-8">
            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                className="text-sm text-text-muted/50 transition-colors duration-300 hover:text-touch-glow/70"
              >
                Clear History
              </button>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-text-muted">
                  Clear all session data?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleClear}
                    className="cursor-pointer rounded-full border border-touch-glow/30 bg-touch-glow/15 px-5 py-2 text-sm font-medium text-touch-glow transition-all duration-300"
                  >
                    Yes, clear
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="cursor-pointer rounded-full border border-white/8 bg-white/4 px-5 py-2 text-sm font-medium text-text-muted transition-all duration-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
