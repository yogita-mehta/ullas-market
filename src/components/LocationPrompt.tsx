import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { MapPin, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";

const LocationPrompt = () => {
    const { user } = useAuth();
    const { detectAndSaveLocation, loading } = useGeolocation();
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (!user || dismissed) return;

        // Check if user already has location saved
        const checkLocation = async () => {
            const { supabase } = await import("@/integrations/supabase/client");
            const { data } = await supabase
                .from("profiles")
                .select("latitude, longitude")
                .eq("user_id", user.id)
                .maybeSingle();

            if (!data?.latitude || !data?.longitude) {
                // Small delay so it doesn't flash on immediate load
                setTimeout(() => setVisible(true), 1500);
            }
        };

        checkLocation();
    }, [user, dismissed]);

    const handleAllow = async () => {
        if (!user) return;
        const result = await detectAndSaveLocation(user.id);
        if (result) {
            toast({
                title: "Location saved! 📍",
                description: `${result.village || result.district}, ${result.state}`,
            });
            setVisible(false);
        } else {
            toast({
                title: "Location access denied",
                description: "You can enable it later from your browser settings.",
                variant: "destructive",
            });
            setVisible(false);
        }
    };

    const handleSkip = () => {
        setDismissed(true);
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="bg-card rounded-2xl shadow-elevated max-w-sm w-full p-6 relative"
                >
                    <button
                        onClick={handleSkip}
                        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <MapPin className="w-8 h-8 text-primary" />
                        </div>

                        <h2 className="text-xl font-display font-bold text-foreground mb-2">
                            Enable Location
                        </h2>
                        <p className="text-sm text-muted-foreground font-body mb-6 leading-relaxed">
                            Allow location access to discover nearby sellers and get the
                            freshest homemade products from your area.
                        </p>

                        <div className="flex flex-col gap-3 w-full">
                            <Button
                                onClick={handleAllow}
                                disabled={loading}
                                className="w-full"
                                size="lg"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Detecting location...
                                    </>
                                ) : (
                                    <>
                                        <MapPin className="w-4 h-4 mr-2" />
                                        Allow Location Access
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={handleSkip}
                                disabled={loading}
                                className="w-full text-muted-foreground"
                            >
                                Maybe Later
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default LocationPrompt;
