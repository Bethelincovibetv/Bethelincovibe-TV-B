export interface MediaPermissionState {
  camera: "granted" | "denied" | "prompt" | "unsupported";
  microphone: "granted" | "denied" | "prompt" | "unsupported";
  isChecking: boolean;
}

export interface RequestMediaResult {
  cameraGranted: boolean;
  micGranted: boolean;
  error?: string;
  stream?: MediaStream;
}

/**
 * Check current browser permission status for camera and microphone
 */
export async function checkMediaPermissions(): Promise<{
  camera: "granted" | "denied" | "prompt" | "unsupported";
  microphone: "granted" | "denied" | "prompt" | "unsupported";
}> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices) {
    return { camera: "unsupported", microphone: "unsupported" };
  }

  let cameraStatus: "granted" | "denied" | "prompt" | "unsupported" = "prompt";
  let micStatus: "granted" | "denied" | "prompt" | "unsupported" = "prompt";

  // Try standard Permissions API if supported
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const camPermission = await navigator.permissions.query({ name: "camera" as any });
      cameraStatus = (camPermission.state as any) || "prompt";
    } catch {
      // Some browsers do not support query({ name: 'camera' })
    }

    try {
      const micPermission = await navigator.permissions.query({ name: "microphone" as any });
      micStatus = (micPermission.state as any) || "prompt";
    } catch {
      // Some browsers do not support query({ name: 'microphone' })
    }
  }

  return { camera: cameraStatus, microphone: micStatus };
}

/**
 * Explicitly prompt user for Camera and/or Microphone permissions via getUserMedia.
 */
export async function requestMediaPermissions(
  options: { camera?: boolean; microphone?: boolean } = { camera: true, microphone: true }
): Promise<RequestMediaResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      cameraGranted: false,
      micGranted: false,
      error: "Camera and Microphone access is not supported in this browser. Please use a modern browser like Chrome, Edge, or Safari.",
    };
  }

  const wantCamera = options.camera ?? true;
  const wantMic = options.microphone ?? true;

  let combinedStream: MediaStream | null = null;
  let camOk = false;
  let micOk = false;
  let lastError = "";

  // 1. Try requesting both together first
  if (wantCamera && wantMic) {
    try {
      combinedStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
        },
      });
      camOk = combinedStream.getVideoTracks().length > 0;
      micOk = combinedStream.getAudioTracks().length > 0;
      return { cameraGranted: camOk, micGranted: micOk, stream: combinedStream };
    } catch (e: any) {
      lastError = e?.message || "Permission request failed";
    }
  }

  // 2. Fallback: try camera individually if requested
  if (wantCamera && !camOk) {
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      camOk = camStream.getVideoTracks().length > 0;
      if (!combinedStream) {
        combinedStream = camStream;
      } else {
        camStream.getVideoTracks().forEach((t) => combinedStream?.addTrack(t));
      }
    } catch (e: any) {
      lastError = e?.message || "Camera permission denied";
    }
  }

  // 3. Fallback: try microphone individually if requested
  if (wantMic && !micOk) {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
        },
      });
      micOk = micStream.getAudioTracks().length > 0;
      if (!combinedStream) {
        combinedStream = micStream;
      } else {
        micStream.getAudioTracks().forEach((t) => combinedStream?.addTrack(t));
      }
    } catch (e: any) {
      lastError = e?.message || "Microphone permission denied";
    }
  }

  return {
    cameraGranted: camOk,
    micGranted: micOk,
    error: (!camOk && wantCamera) || (!micOk && wantMic) ? lastError : undefined,
    stream: combinedStream || undefined,
  };
}
