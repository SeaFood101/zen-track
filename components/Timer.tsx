"use client";

interface TimerProps {
  secondsLeft: number;
}

export default function Timer({ secondsLeft }: TimerProps) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="absolute left-1/2 top-6 -translate-x-1/2 text-sm font-medium text-text-muted/60 tabular-nums">
      {display}
    </div>
  );
}
