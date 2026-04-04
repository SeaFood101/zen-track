"use client";

import { useRef, useCallback } from "react";

export function useWebGazer() {
  const initializedRef = useRef(false);

  const initialize = useCallback(async () => {
    if (initializedRef.current) return;
    if (typeof window === "undefined" || !window.webgazer) return;

    // Request camera permission first so we get a clear error on denial
    const preStream = await navigator.mediaDevices.getUserMedia({ video: true });
    // Stop it — WebGazer will open its own stream
    preStream.getTracks().forEach((t) => t.stop());

    const wg = window.webgazer;

    wg.showVideoPreview(false)
      .showPredictionPoints(false)
      .showFaceOverlay(false)
      .showFaceFeedbackBox(false)
      .saveDataAcrossSessions(true)
      .applyKalmanFilter(true)
      .setRegression("ridge");

    await wg.begin();
    initializedRef.current = true;
  }, []);

  const recordCalibrationPoint = useCallback((x: number, y: number) => {
    if (typeof window === "undefined" || !window.webgazer) return;
    window.webgazer.recordScreenPosition(x, y, "click");
  }, []);

  const setGazeListener = useCallback((listener: GazeListener) => {
    if (typeof window === "undefined" || !window.webgazer) return;
    window.webgazer.setGazeListener(listener);
  }, []);

  const clearGazeListener = useCallback(() => {
    if (typeof window === "undefined" || !window.webgazer) return;
    window.webgazer.clearGazeListener();
  }, []);

  const pause = useCallback(() => {
    if (typeof window === "undefined" || !window.webgazer) return;
    window.webgazer.pause();
  }, []);

  const resume = useCallback(async () => {
    if (typeof window === "undefined" || !window.webgazer) return;
    await window.webgazer.resume();
  }, []);

  const end = useCallback(() => {
    if (typeof window === "undefined" || !window.webgazer) return;
    try {
      window.webgazer.end();
    } catch {
      // WebGazer may throw if already ended
    }
    initializedRef.current = false;
  }, []);

  const getStream = useCallback((): MediaStream | null => {
    // WebGazer creates a video element with id "webgazerVideoFeed"
    const videoEl = document.getElementById("webgazerVideoFeed") as HTMLVideoElement | null;
    return (videoEl?.srcObject as MediaStream) ?? null;
  }, []);

  return {
    initialize,
    recordCalibrationPoint,
    setGazeListener,
    clearGazeListener,
    pause,
    resume,
    end,
    getStream,
  };
}
