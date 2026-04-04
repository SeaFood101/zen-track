"use client";

import Script from "next/script";

interface WebGazerScriptProps {
  onReady?: () => void;
}

export default function WebGazerScript({ onReady }: WebGazerScriptProps) {
  return (
    <Script
      src="https://webgazer.cs.brown.edu/webgazer.js"
      strategy="lazyOnload"
      onReady={() => {
        if (typeof window !== "undefined" && window.webgazer) {
          onReady?.();
        }
      }}
    />
  );
}
