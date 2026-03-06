import { useState, useRef, useCallback, useEffect } from "react";

interface UseVoiceRecorderReturn {
    isRecording: boolean;
    isPreparing: boolean;
    audioBase64: string | null;
    audioBlob: Blob | null;
    audioMimeType: string | null;
    duration: number;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    reset: () => void;
    error: string | null;
}

const MAX_DURATION_MS = 30_000; // 30 seconds

export function useVoiceRecorder(): UseVoiceRecorderReturn {
    const [isRecording, setIsRecording] = useState(false);
    const [isPreparing, setIsPreparing] = useState(false);
    const [audioBase64, setAudioBase64] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioMimeType, setAudioMimeType] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number>(0);
    const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const cleanup = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (maxTimerRef.current) {
            clearTimeout(maxTimerRef.current);
            maxTimerRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        mediaRecorderRef.current = null;
        chunksRef.current = [];
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    const startRecording = useCallback(async () => {
        setError(null);
        setAudioBase64(null);
        setDuration(0);
        setIsPreparing(true);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Prefer webm/opus, fall back to webm, then let the browser decide
            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : MediaRecorder.isTypeSupported("audio/webm")
                    ? "audio/webm"
                    : "";

            const recorderOptions: MediaRecorderOptions = mimeType ? { mimeType } : {};
            const mediaRecorder = new MediaRecorder(stream, recorderOptions);
            const actualMime = mediaRecorder.mimeType || mimeType || "audio/webm";
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: actualMime });
                setAudioBlob(blob);
                setAudioMimeType(actualMime);

                // #region agent log
                fetch('http://127.0.0.1:7728/ingest/c93e0e8b-3052-4f59-93ee-27b7541b6521', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Debug-Session-Id': 'f5aedc',
                    },
                    body: JSON.stringify({
                        sessionId: 'f5aedc',
                        runId: 'pre-fix',
                        hypothesisId: 'H0',
                        location: 'useVoiceRecorder.ts:onstop',
                        message: 'MediaRecorder stopped and blob created',
                        data: {
                            size: blob.size,
                            type: blob.type,
                        },
                        timestamp: Date.now(),
                    }),
                }).catch(() => { });
                // #endregion

                // Also set base64 for backward compat
                const reader = new FileReader();
                reader.onloadend = () => {
                    setAudioBase64(reader.result as string);
                };
                reader.readAsDataURL(blob);

                // Stop all tracks
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach((track) => track.stop());
                    streamRef.current = null;
                }
            };

            mediaRecorder.start(250); // collect chunks every 250ms
            startTimeRef.current = Date.now();
            setIsRecording(true);
            setIsPreparing(false);

            // Duration timer
            timerRef.current = setInterval(() => {
                setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }, 200);

            // Auto-stop at max duration
            maxTimerRef.current = setTimeout(() => {
                if (
                    mediaRecorderRef.current &&
                    mediaRecorderRef.current.state === "recording"
                ) {
                    mediaRecorderRef.current.stop();
                    setIsRecording(false);
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }
                }
            }, MAX_DURATION_MS);
        } catch (err: any) {
            setIsPreparing(false);
            if (err.name === "NotAllowedError") {
                setError("Microphone permission denied. Please allow access and try again.");
            } else if (err.name === "NotFoundError") {
                setError("No microphone found. Please connect a microphone.");
            } else {
                setError(err.message || "Failed to start recording.");
            }
            cleanup();
        }
    }, [cleanup]);

    const stopRecording = useCallback(() => {
        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state === "recording"
        ) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            if (maxTimerRef.current) {
                clearTimeout(maxTimerRef.current);
                maxTimerRef.current = null;
            }
        }
    }, []);

    const reset = useCallback(() => {
        cleanup();
        setIsRecording(false);
        setIsPreparing(false);
        setAudioBase64(null);
        setAudioBlob(null);
        setAudioMimeType(null);
        setDuration(0);
        setError(null);
    }, [cleanup]);

    return {
        isRecording,
        isPreparing,
        audioBase64,
        audioBlob,
        audioMimeType,
        duration,
        startRecording,
        stopRecording,
        reset,
        error,
    };
}
