interface WebGazerPrediction {
  x: number;
  y: number;
}

type GazeListener = (
  data: WebGazerPrediction | null,
  timestamp: number
) => void;

interface WebGazerInstance {
  begin(): Promise<WebGazerInstance>;
  end(): WebGazerInstance;
  pause(): WebGazerInstance;
  resume(): Promise<WebGazerInstance>;
  setGazeListener(listener: GazeListener): WebGazerInstance;
  clearGazeListener(): WebGazerInstance;
  getCurrentPrediction(): Promise<WebGazerPrediction | null>;
  showVideoPreview(show: boolean): WebGazerInstance;
  showVideo(show: boolean): WebGazerInstance;
  showPredictionPoints(show: boolean): WebGazerInstance;
  showFaceOverlay(show: boolean): WebGazerInstance;
  showFaceFeedbackBox(show: boolean): WebGazerInstance;
  saveDataAcrossSessions(save: boolean): WebGazerInstance;
  applyKalmanFilter(apply: boolean): WebGazerInstance;
  setRegression(type: string): WebGazerInstance;
  setTracker(type: string): WebGazerInstance;
  clearData(): WebGazerInstance;
  recordScreenPosition(x: number, y: number, eventType: string): void;
}

interface Window {
  webgazer: WebGazerInstance;
}
