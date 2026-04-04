"use client";

import { useRef, useCallback } from "react";

interface TimerProps {
  secondsLeft: number;
  onTripleTap?: () => void;
}

export default function Timer({ secondsLeft, onTripleTap }: TimerProps) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTap = useCallback(() => {
    tapCount.current++;
    if (tapCount.current >= 3) {
      tapCount.current = 0;
      if (tapTimer.current) clearTimeout(tapTimer.current);
      tapTimer.current = null;
      onTripleTap?.();
      return;
    }
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
      tapTimer.current = null;
    }, 600);
  }, [onTripleTap]);

  return (
    <div
      className="absolute left-1/2 top-6 z-30 -translate-x-1/2 select-none px-4 py-2 text-sm font-medium text-text-muted/60 tabular-nums"
      onClick={handleTap}
      onTouchEnd={(e) => {
        e.preventDefault();
        handleTap();
      }}
    >
      {display}
    </div>
  );
}
