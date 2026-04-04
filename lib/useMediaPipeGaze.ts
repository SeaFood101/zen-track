"use client";

import { useCallback } from "react";

// ── Iris & eye landmark indices ──
const L_IRIS = 468;
const R_IRIS = 473;
const L_EYE_INNER = 133;
const L_EYE_OUTER = 33;
const R_EYE_INNER = 362;
const R_EYE_OUTER = 263;
const L_EYE_TOP = 159;
const L_EYE_BOTTOM = 145;
const R_EYE_TOP = 386;
const R_EYE_BOTTOM = 374;

// ── Module-level state (persists across client-side navigations) ──
let faceMesh: InstanceType<
  typeof import("@mediapipe/face_mesh").FaceMesh
> | null = null;
let video: HTMLVideoElement | null = null;
let stream: MediaStream | null = null;
let initialized = false;
let running = false;
let rafId = 0;
let listener: GazeListener | null = null;

// Calibration data
let calData: { h: number; v: number; sx: number; sy: number }[] = [];
let mapCoeffs: {
  ax: number;
  bx: number;
  ay: number;
  by: number;
} | null = null;

// Current iris ratios (written by frame loop, read by recordCalibrationPoint)
let curH = 0.5;
let curV = 0.5;

// ── Helpers ──

function computeIrisRatios(
  lm: { x: number; y: number; z: number }[]
): { h: number; v: number } {
  const li = lm[L_IRIS];
  const ri = lm[R_IRIS];

  // Horizontal ratio (iris position between outer→inner eye corners)
  const lHRange = lm[L_EYE_INNER].x - lm[L_EYE_OUTER].x;
  const rHRange = lm[R_EYE_INNER].x - lm[R_EYE_OUTER].x;
  const lH = lHRange ? (li.x - lm[L_EYE_OUTER].x) / lHRange : 0.5;
  const rH = rHRange ? (ri.x - lm[R_EYE_OUTER].x) / rHRange : 0.5;

  // Vertical ratio (iris position between top→bottom eyelid)
  const lVRange = lm[L_EYE_BOTTOM].y - lm[L_EYE_TOP].y;
  const rVRange = lm[R_EYE_BOTTOM].y - lm[R_EYE_TOP].y;
  const lV = lVRange ? (li.y - lm[L_EYE_TOP].y) / lVRange : 0.5;
  const rV = rVRange ? (ri.y - lm[R_EYE_TOP].y) / rVRange : 0.5;

  return { h: (lH + rH) / 2, v: (lV + rV) / 2 };
}

function computeMapping() {
  const n = calData.length;
  if (n < 3) {
    mapCoeffs = null;
    return;
  }

  let sH = 0,
    sV = 0,
    sX = 0,
    sY = 0,
    sHH = 0,
    sVV = 0,
    sHX = 0,
    sVY = 0;
  for (const d of calData) {
    sH += d.h;
    sV += d.v;
    sX += d.sx;
    sY += d.sy;
    sHH += d.h * d.h;
    sVV += d.v * d.v;
    sHX += d.h * d.sx;
    sVY += d.v * d.sy;
  }

  const denomH = n * sHH - sH * sH;
  const denomV = n * sVV - sV * sV;

  if (Math.abs(denomH) < 1e-10 || Math.abs(denomV) < 1e-10) {
    mapCoeffs = null;
    return;
  }

  mapCoeffs = {
    ax: (n * sHX - sH * sX) / denomH,
    bx: (sX - ((n * sHX - sH * sX) / denomH) * sH) / n,
    ay: (n * sVY - sV * sY) / denomV,
    by: (sY - ((n * sVY - sV * sY) / denomV) * sV) / n,
  };
}

function startLoop() {
  const loop = async () => {
    if (!running || !video || !faceMesh) return;
    try {
      await faceMesh.send({ image: video });
    } catch {
      // skip frame
    }
    if (running) {
      rafId = requestAnimationFrame(loop);
    }
  };
  loop();
}

// ── Hook ──

export function useMediaPipeGaze() {
  const initialize = useCallback(async () => {
    if (initialized) return;

    // Request camera
    const s = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
    });
    stream = s;

    // Hidden video element for FaceMesh processing
    // Must stay in viewport with real dimensions — mobile browsers
    // throttle or skip frames for off-screen / 1×1 elements.
    const v = document.createElement("video");
    v.srcObject = s;
    v.setAttribute("playsinline", "true");
    v.setAttribute("autoplay", "true");
    v.muted = true;
    v.style.position = "fixed";
    v.style.top = "0";
    v.style.left = "0";
    v.style.width = "320px";
    v.style.height = "240px";
    v.style.opacity = "0.01";
    v.style.pointerEvents = "none";
    v.style.zIndex = "-9999";
    document.body.appendChild(v);

    // Wait for video to have actual frame data before proceeding
    await new Promise<void>((resolve) => {
      const onReady = () => {
        v.removeEventListener("loadeddata", onReady);
        resolve();
      };
      if (v.readyState >= 2) {
        resolve();
      } else {
        v.addEventListener("loadeddata", onReady);
      }
      v.play().catch(() => {});
    });
    video = v;

    // Load FaceMesh
    const { FaceMesh } = await import("@mediapipe/face_mesh");
    const fm = new FaceMesh({
      locateFile: (file: string) => `/mediapipe/face_mesh/${file}`,
    });
    fm.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    fm.onResults((results) => {
      const faces = results.multiFaceLandmarks;
      if (faces && faces.length > 0 && faces[0].length > R_IRIS + 4) {
        const { h, v } = computeIrisRatios(faces[0]);
        curH = h;
        curV = v;

        if (listener) {
          if (mapCoeffs) {
            const x = mapCoeffs.ax * h + mapCoeffs.bx;
            const y = mapCoeffs.ay * v + mapCoeffs.by;
            listener({ x, y }, performance.now());
          } else {
            // Face detected but no mapping yet — signal face presence
            listener(
              { x: window.innerWidth / 2, y: window.innerHeight / 2 },
              performance.now()
            );
          }
        }
      } else {
        // No face
        if (listener) {
          listener(null, performance.now());
        }
      }
    });

    faceMesh = fm;
    initialized = true;

    // Reset calibration
    calData = [];
    mapCoeffs = null;

    running = true;
    startLoop();
  }, []);

  const recordCalibrationPoint = useCallback((x: number, y: number) => {
    calData.push({ h: curH, v: curV, sx: x, sy: y });
    if (calData.length >= 3) computeMapping();
  }, []);

  const setGazeListener = useCallback((cb: GazeListener) => {
    listener = cb;
  }, []);

  const clearGazeListener = useCallback(() => {
    listener = null;
  }, []);

  const pause = useCallback(() => {
    running = false;
    cancelAnimationFrame(rafId);
  }, []);

  const resume = useCallback(async () => {
    if (!initialized) return;
    running = true;
    startLoop();
  }, []);

  const end = useCallback(() => {
    running = false;
    cancelAnimationFrame(rafId);
    if (faceMesh) {
      try {
        faceMesh.close();
      } catch {}
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    if (video) {
      video.remove();
    }
    faceMesh = null;
    video = null;
    stream = null;
    initialized = false;
    listener = null;
  }, []);

  const getStream = useCallback((): MediaStream | null => stream, []);

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
