import { useState, useRef, useCallback, useEffect } from "react";

interface UseVoiceRecorderReturn {
    isRecording: boolean;
    isPreparing: boolean;
    audioBase64: string | null;
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

            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : "audio/webm";

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType });

                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result as string;
                    // Strip data URI prefix — the edge function handles both formats
                    setAudioBase64(base64);
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
        setDuration(0);
        setError(null);
    }, [cleanup]);

    return {
        isRecording,
        isPreparing,
        audioBase64,
        duration,
        startRecording,
        stopRecording,
        reset,
        error,
    };
}
