/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useWebSocketAgent — custom hook yang mengelola semua komunikasi WebSocket
 * dengan backend, termasuk audio worklet, video frame streaming, dan
 * pemrosesan pesan Gemini (audio, tool calls, status).
 *
 * Menggantikan penggunaan langsung @google/genai SDK di browser.
 */

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type {
  AgentStatus,
  ServerMessage,
  ToolCallItem,
  ToolResponseItem,
} from "../types/agentProtocol";

// ─── Audio Worklet (berjalan di AudioWorkletGlobalScope) ─────────────────────

const WORKLET_CODE = `
  class PCMProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      this.buffer = new Int16Array(4096);
      this.offset = 0;
    }
    process(inputs) {
      const input = inputs[0];
      if (input && input.length > 0 && input[0]) {
        const channelData = input[0];
        
        // Cek volume (RMS sederhana)
        let sumSquares = 0;
        for (let i = 0; i < channelData.length; i++) {
           sumSquares += channelData[i] * channelData[i];
        }
        const rms = Math.sqrt(sumSquares / channelData.length);
        this.port.postMessage({ type: 'volume', volume: rms });

        for (let i = 0; i < channelData.length; i++) {
          const s = Math.max(-1, Math.min(1, channelData[i]));
          this.buffer[this.offset++] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          if (this.offset >= this.buffer.length) {
            const copy = new Int16Array(this.buffer);
            this.port.postMessage({ type: 'audio', buffer: copy.buffer }, [copy.buffer]);
            this.offset = 0;
          }
        }
      }
      return true;
    }
  }
  registerProcessor('pcm-processor', PCMProcessor);
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// ─── Hook Interface ───────────────────────────────────────────────────────────

interface UseWebSocketAgentOptions {
  /** Ringkasan meal logs dari AppContext, dikirim ke server saat start_session */
  mealLogs: string;
  /** Ref ke elemen <video> untuk preview kamera dan pengiriman frame */
  videoRef: RefObject<HTMLVideoElement | null>;
  /**
   * Callback dipanggil saat Gemini meminta tool call.
   * Harus mengembalikan array ToolResponseItem untuk dikirim balik ke Gemini.
   */
  onToolCall: (calls: ToolCallItem[]) => ToolResponseItem[];
}

interface UseWebSocketAgentResult {
  aiStatus: AgentStatus;
  aiText: string;
  isMuted: boolean;
  isVideoOff: boolean;
  volume: number;
  toggleMute: () => void;
  toggleVideo: () => void;
  switchCamera: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useWebSocketAgent({
  mealLogs,
  videoRef,
  onToolCall,
}: UseWebSocketAgentOptions): UseWebSocketAgentResult {
  const [aiStatus, setAiStatus] = useState<AgentStatus>("CONNECTING");
  const [aiText, setAiText] = useState("Connecting to Dr. Moriesly...");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [volume, setVolume] = useState<number>(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  // Refs untuk nilai terkini (digunakan dalam closure async tanpa re-subscribe effect)
  const isMutedRef = useRef(false);
  const isVideoOffRef = useRef(false);
  const onToolCallRef = useRef(onToolCall);
  const facingModeRef = useRef<{ mode: "user" | "environment" }>({
    mode: facingMode,
  });

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);
  useEffect(() => {
    isVideoOffRef.current = isVideoOff;
  }, [isVideoOff]);
  useEffect(() => {
    onToolCallRef.current = onToolCall;
  }, [onToolCall]);
  useEffect(() => {
    facingModeRef.current.mode = facingMode;
  }, [facingMode]);

  // ── Setup effect — dijalankan sekali saat mount ───────────────────────────
  useEffect(() => {
    let isMounted = true;
    let workletNode: AudioWorkletNode | null = null;
    let videoInterval: ReturnType<typeof setInterval> | null = null;

    const setup = async () => {
      try {
        // 1. Setup AudioContext
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
        nextPlayTimeRef.current = audioContextRef.current.currentTime;

        // 2. Minta akses kamera + mikrofon
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingModeRef.current.mode },
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        // Tentukan URL WebSocket:
        // - Production: gunakan VITE_WS_URL dari environment (mis. wss://api.domain.com/ws)
        // - Development: gunakan proxy Vite yang diarahkan ke localhost:3001
        const wsUrl =
          (import.meta.env.VITE_WS_URL as string) ??
          `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          // Kirim mealLogs sehingga backend bisa menginformasikan Gemini
          ws.send(JSON.stringify({ type: "start_session", mealLogs }));
        };

        ws.onmessage = async (event) => {
          if (!isMounted) return;
          const msg: ServerMessage = JSON.parse(event.data as string);

          switch (msg.type) {
            // ── Session siap: setup audio worklet + video interval ──────────
            case "session_ready": {
              const blob = new Blob([WORKLET_CODE], {
                type: "application/javascript",
              });
              const workletUrl = URL.createObjectURL(blob);
              await audioContextRef.current!.audioWorklet.addModule(workletUrl);

              workletNode = new AudioWorkletNode(
                audioContextRef.current!,
                "pcm-processor",
              );
              workletNode.port.onmessage = (e) => {
                const data = e.data;
                if (data.type === "volume") {
                  if (isMounted) setVolume(data.volume);
                  return;
                }

                if (
                  isMutedRef.current ||
                  ws.readyState !== WebSocket.OPEN ||
                  data.type !== "audio"
                )
                  return;

                // Mencegah Audio Loop/Echo: Membisukan pengiriman mic ke server sementara AI sedang berbicara
                const isAiPlaying =
                  audioContextRef.current &&
                  audioContextRef.current.currentTime < nextPlayTimeRef.current;

                if (isAiPlaying) return;

                const base64 = arrayBufferToBase64(data.buffer as ArrayBuffer);
                ws.send(JSON.stringify({ type: "audio_chunk", data: base64 }));
              };

              const micSource =
                audioContextRef.current!.createMediaStreamSource(stream);
              micSource.connect(workletNode);
              workletNode.connect(audioContextRef.current!.destination);

              // Kirim frame video lebih cepat untuk real-time tracking (contoh: 500ms = 2 FPS)
              const canvas = document.createElement("canvas");
              canvas.width = 160;
              canvas.height = 120;
              const ctx = canvas.getContext("2d");

              videoInterval = setInterval(() => {
                if (
                  videoRef.current &&
                  !isVideoOffRef.current &&
                  ctx &&
                  ws.readyState === WebSocket.OPEN
                ) {
                  ctx.drawImage(
                    videoRef.current,
                    0,
                    0,
                    canvas.width,
                    canvas.height,
                  );
                  const base64 = canvas
                    .toDataURL("image/jpeg", 0.3)
                    .split(",")[1];
                  ws.send(
                    JSON.stringify({ type: "video_frame", data: base64 }),
                  );
                }
              }, 500);
              break;
            }

            // ── Update status (LISTENING, SPEAKING, dll) ───────────────────
            case "status":
              if (isMounted) {
                setAiStatus(msg.status);
                setAiText(msg.text);
              }
              break;

            // ── Audio dari Gemini: decode dan mainkan ──────────────────────
            case "ai_audio": {
              if (!audioContextRef.current || !isMounted) break;
              setAiStatus("SPEAKING");
              setAiText("Dr. Moriesly is speaking...");

              const arrayBuffer = base64ToArrayBuffer(msg.data);
              const int16 = new Int16Array(arrayBuffer);
              const float32 = new Float32Array(int16.length);
              for (let i = 0; i < int16.length; i++) {
                float32[i] = int16[i] / 32768.0;
              }

              const audioBuffer = audioContextRef.current.createBuffer(
                1,
                float32.length,
                24000,
              );
              audioBuffer.getChannelData(0).set(float32);

              const audioSource = audioContextRef.current.createBufferSource();
              audioSource.buffer = audioBuffer;
              audioSource.connect(audioContextRef.current.destination);

              let startTime = nextPlayTimeRef.current;
              const now = audioContextRef.current.currentTime;
              if (startTime < now) startTime = now + 0.05;

              audioSource.start(startTime);
              nextPlayTimeRef.current = startTime + audioBuffer.duration;
              activeSourcesRef.current.push(audioSource);

              audioSource.onended = () => {
                activeSourcesRef.current = activeSourcesRef.current.filter(
                  (s) => s !== audioSource,
                );
                if (
                  activeSourcesRef.current.length === 0 &&
                  audioContextRef.current &&
                  audioContextRef.current.currentTime >= nextPlayTimeRef.current
                ) {
                  if (isMounted) {
                    setAiStatus("LISTENING");
                    setAiText("I'm listening...");
                  }
                }
              };
              break;
            }

            // ── Gemini interrupt: hentikan semua audio yang sedang diputar ─
            case "interrupted":
              if (isMounted) {
                setAiStatus("LISTENING");
                setAiText("I'm listening...");
              }
              nextPlayTimeRef.current =
                audioContextRef.current?.currentTime ?? 0;
              activeSourcesRef.current.forEach((s) => {
                try {
                  s.stop();
                } catch {
                  /* ignore */
                }
              });
              activeSourcesRef.current = [];
              break;

            // ── Tool call dari Gemini: proses di React, kirim respons ──────
            case "tool_call": {
              const responses = onToolCallRef.current(msg.calls);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "tool_response", responses }));
              }
              break;
            }

            // ── Error dari server ──────────────────────────────────────────
            case "error":
              console.error("[Agent] Server error:", msg.message);
              if (isMounted) {
                setAiStatus("ERROR");
                setAiText("Connection error. Please try again.");
              }
              break;
          }
        };

        ws.onclose = () => {
          if (isMounted) setAiStatus("DISCONNECTED");
        };

        ws.onerror = () => {
          if (isMounted) {
            setAiStatus("ERROR");
            setAiText(
              "Failed to connect to AI backend. Is the server running?",
            );
          }
        };
      } catch (err) {
        console.error("[Agent] Setup error:", err);
        if (isMounted) {
          setAiText(
            "Failed to initialize. Please check camera/microphone permissions.",
          );
        }
      }
    };

    setup();

    // ── Cleanup saat component unmount ─────────────────────────────────────
    return () => {
      isMounted = false;
      if (videoInterval) clearInterval(videoInterval);
      if (workletNode) workletNode.disconnect();
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "stop_session" }));
        }
        wsRef.current.close();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Controls ──────────────────────────────────────────────────────────────

  const toggleMute = () => {
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((prev) => !prev);
  };

  const toggleVideo = async () => {
    if (isVideoOffRef.current) {
      // Turn video back on by requesting a new video track
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingModeRef.current.mode },
        });
        const newVideoTrack = videoStream.getVideoTracks()[0];

        if (streamRef.current) {
          streamRef.current.addTrack(newVideoTrack);
        }

        if (videoRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }
        setIsVideoOff(false);
      } catch (err) {
        console.error("Failed to restart video:", err);
      }
    } else {
      // Completely stop the video tracks to turn off the camera light
      streamRef.current?.getVideoTracks().forEach((t) => {
        t.stop();
        streamRef.current?.removeTrack(t);
      });
      setIsVideoOff(true);
    }
  };

  const switchCamera = async () => {
    try {
      const newMode =
        facingModeRef.current.mode === "user" ? "environment" : "user";
      setFacingMode(newMode);
      facingModeRef.current.mode = newMode; // Update ref immediately for async tasks

      // If video is not off, switch the active track
      if (!isVideoOffRef.current) {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: newMode } },
        });
        const newVideoTrack = videoStream.getVideoTracks()[0];

        if (streamRef.current) {
          // Stop and remove existing video tracks
          streamRef.current.getVideoTracks().forEach((t) => {
            t.stop();
            streamRef.current?.removeTrack(t);
          });

          // Add newly acquired video track
          streamRef.current.addTrack(newVideoTrack);
        }

        // Re-assign to fix display if needed
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.srcObject = streamRef.current;
        }
      }
    } catch (err) {
      console.error("Failed to switch camera:", err);
      // Fallback if 'exact' constraint fails
      try {
        const fallbackMode = facingModeRef.current.mode;
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: fallbackMode },
        });
        const newVideoTrack = videoStream.getVideoTracks()[0];

        if (streamRef.current) {
          streamRef.current.getVideoTracks().forEach((t) => {
            t.stop();
            streamRef.current?.removeTrack(t);
          });
          streamRef.current.addTrack(newVideoTrack);
        }

        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.srcObject = streamRef.current;
        }
      } catch (fallbackErr) {
        console.error("Fallback camera switch failed", fallbackErr);
      }
    }
  };

  return {
    aiStatus,
    aiText,
    isMuted,
    isVideoOff,
    volume,
    toggleMute,
    toggleVideo,
    switchCamera,
  };
}
