"use client";

import { useState } from "react";
import { Session } from "@/lib/storage";

interface SessionCardProps {
  session: Session;
}

export default function SessionCard({ session }: SessionCardProps) {
  const [expanded, setExpanded] = useState(false);

  const date = new Date(session.date);
  const formatted = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const durationLabel = `${Math.round(session.duration / 60)} min`;

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="w-full cursor-pointer rounded-2xl border border-white/6 bg-white/3 text-left transition-all duration-400 ease-in-out"
    >
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-text-primary">
            {formatted}
          </span>
          <span className="text-xs text-text-muted">
            {time} · {durationLabel}
          </span>
        </div>
        <span className="text-lg font-semibold tabular-nums text-text-primary">
          {Math.round(session.combinedAccuracy)}%
        </span>
      </div>

      <div
        className="grid transition-all duration-400 ease-in-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="flex gap-4 px-5 pb-4 pt-1">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-eye-glow" />
              <span className="text-xs text-text-muted">Eye</span>
              <span className="text-sm font-medium tabular-nums text-eye-glow">
                {Math.round(session.eyeAccuracy)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-touch-glow" />
              <span className="text-xs text-text-muted">Touch</span>
              <span className="text-sm font-medium tabular-nums text-touch-glow">
                {Math.round(session.touchAccuracy)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
