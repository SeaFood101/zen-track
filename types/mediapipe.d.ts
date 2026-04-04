declare module "@mediapipe/face_mesh" {
  interface FaceMeshConfig {
    locateFile?: (file: string) => string;
  }

  interface FaceMeshOptions {
    maxNumFaces?: number;
    refineLandmarks?: boolean;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
  }

  interface NormalizedLandmark {
    x: number;
    y: number;
    z: number;
  }

  interface FaceMeshResults {
    multiFaceLandmarks?: NormalizedLandmark[][];
  }

  export class FaceMesh {
    constructor(config?: FaceMeshConfig);
    setOptions(options: FaceMeshOptions): void;
    onResults(callback: (results: FaceMeshResults) => void): void;
    send(input: {
      image: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement;
    }): Promise<void>;
    close(): void;
  }
}
