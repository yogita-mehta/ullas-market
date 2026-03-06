import { useState, useEffect, useCallback } from "react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export interface VoiceExtractResult {
    transcript: string;
    official_name: string;
    local_name: string;
    short_description: string;
    full_description: string;
    price: number;
    quantity: number;
    unit: string;
    category: string;
    language: string;
    dialect_detected: string;
    ai_confidence: number;
    missing_fields?: string[];
}

interface VoiceUploadButtonProps {
    onResult: (result: VoiceExtractResult) => void;
    disabled?: boolean;
}

const VoiceUploadButton = ({ onResult, disabled }: VoiceUploadButtonProps) => {
    const {
        isRecording,
        isPreparing,
        audioBlob,
        audioMimeType,
        duration,
        startRecording,
        stopRecording,
        reset,
        error: recorderError,
    } = useVoiceRecorder();

    const [isProcessing, setIsProcessing] = useState(false);

    // Show recorder errors as toasts
    useEffect(() => {
        if (recorderError) {
            toast({
                title: "Recording Error",
                description: recorderError,
                variant: "destructive",
            });
        }
    }, [recorderError]);

    // When audio is ready, send to Edge Function as FormData
    const processAudio = useCallback(
        async (blob: Blob) => {
            setIsProcessing(true);
            try {
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
                        hypothesisId: 'H1',
                        location: 'VoiceUploadButton.tsx:processAudio:start',
                        message: 'processAudio called with blob',
                        data: {
                            size: blob.size,
                            type: blob.type,
                            audioMimeType,
                        },
                        timestamp: Date.now(),
                    }),
                }).catch(() => { });
                // #endregion

                const { data: { session } } = await supabase.auth.getSession();
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

                const formData = new FormData();
                formData.append("audio", blob, `audio.${audioMimeType?.includes("wav") ? "wav" : "webm"}`);

                const res = await fetch(
                    `${supabaseUrl}/functions/v1/extract-market-item`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${session?.access_token}`,
                            // No Content-Type — browser sets multipart/form-data + boundary automatically
                        },
                        body: formData,
                    }
                );

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
                        hypothesisId: 'H2',
                        location: 'VoiceUploadButton.tsx:processAudio:response',
                        message: 'Received response from extract-market-item',
                        data: {
                            ok: res.ok,
                            status: res.status,
                        },
                        timestamp: Date.now(),
                    }),
                }).catch(() => { });
                // #endregion

                const data = await res.json();
                const error = !res.ok ? { message: data?.error || `HTTP ${res.status}` } : null;

                if (error) {
                    throw new Error(error.message || "Edge Function call failed");
                }

                if (data?.error && !data?.official_name) {
                    // GPT extraction failed but transcript might be available
                    toast({
                        title: "AI Extraction Issue",
                        description:
                            data.error || "Could not extract product info. Please fill manually.",
                        variant: "destructive",
                    });
                    return;
                }

                if (data?.official_name) {
                    // Check for missing fields and warn the user
                    const missingFields: string[] = data.missing_fields || [];
                    if (!missingFields.length) {
                        if (!data.price || data.price === 0) missingFields.push("price");
                        if (!data.quantity || data.quantity === 0) missingFields.push("quantity");
                    }

                    const result: VoiceExtractResult = {
                        ...(data as VoiceExtractResult),
                        missing_fields: missingFields.length > 0 ? missingFields : undefined,
                    };

                    onResult(result);

                    if (missingFields.length > 0) {
                        toast({
                            title: "⚠️ Incomplete Extraction",
                            description: `Could not detect: ${missingFields.join(", ")}. Please fill manually.`,
                        });
                    } else {
                        toast({
                            title: "✨ AI Extraction Complete",
                            description: `Detected: ${data.official_name}${data.dialect_detected ? ` (${data.dialect_detected})` : ""}`,
                        });
                    }
                } else {
                    toast({
                        title: "No product info detected",
                        description: "Please try speaking more clearly about the product.",
                        variant: "destructive",
                    });
                }
            } catch (err: any) {
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
                        hypothesisId: 'H3',
                        location: 'VoiceUploadButton.tsx:processAudio:error',
                        message: 'processAudio threw error',
                        data: {
                            message: err?.message ?? 'unknown',
                        },
                        timestamp: Date.now(),
                    }),
                }).catch(() => { });
                // #endregion

                toast({
                    title: "Processing Failed",
                    description: err.message || "Could not process audio. Please try again.",
                    variant: "destructive",
                });
            } finally {
                setIsProcessing(false);
                reset();
            }
        },
        [onResult, reset, audioMimeType]
    );

    // Watch for audioBlob (set after recording stops)
    useEffect(() => {
        if (audioBlob) {
            processAudio(audioBlob);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [audioBlob]);

    const handleClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    if (isProcessing) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20"
            >
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs font-body text-primary font-medium">
                    AI processing...
                </span>
                <Sparkles className="w-3 h-3 text-primary/60" />
            </motion.div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <AnimatePresence mode="wait">
                {isRecording ? (
                    <motion.div
                        key="recording"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex items-center gap-2"
                    >
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={handleClick}
                            className="relative"
                        >
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className="absolute inset-0 rounded-md bg-red-500/20"
                            />
                            <MicOff className="w-4 h-4 mr-1" />
                            Stop
                        </Button>
                        <div className="flex items-center gap-1.5">
                            <motion.div
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ repeat: Infinity, duration: 1 }}
                                className="w-2 h-2 rounded-full bg-red-500"
                            />
                            <span className="text-xs font-mono text-muted-foreground font-medium">
                                {formatDuration(duration)}
                            </span>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="idle"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                    >
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleClick}
                            disabled={disabled || isPreparing}
                            className="gap-1.5 border-primary/30 hover:bg-primary/5 hover:border-primary/50 transition-colors"
                            id="voice-upload-btn"
                        >
                            {isPreparing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Mic className="w-4 h-4 text-primary" />
                            )}
                            <span className="text-xs">
                                {isPreparing ? "Preparing..." : "Voice AI"}
                            </span>
                            <Sparkles className="w-3 h-3 text-primary/60" />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VoiceUploadButton;
