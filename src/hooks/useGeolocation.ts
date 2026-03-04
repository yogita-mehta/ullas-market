import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { reverseGeocode } from "@/lib/geo";

export interface UserLocation {
    latitude: number;
    longitude: number;
    village: string;
    district: string;
    state: string;
    pincode: string;
}

interface UseGeolocationReturn {
    location: UserLocation | null;
    loading: boolean;
    error: string | null;
    detectAndSaveLocation: (userId: string) => Promise<UserLocation | null>;
}

export function useGeolocation(): UseGeolocationReturn {
    const [location, setLocation] = useState<UserLocation | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const detectAndSaveLocation = useCallback(
        async (userId: string): Promise<UserLocation | null> => {
            setLoading(true);
            setError(null);

            try {
                // Request GPS coordinates from browser
                const position = await new Promise<GeolocationPosition>(
                    (resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                            enableHighAccuracy: true,
                            timeout: 10000,
                            maximumAge: 300000, // 5 minutes cache
                        });
                    }
                );

                const { latitude, longitude } = position.coords;

                // Reverse geocode to get address details
                const geocoded = await reverseGeocode(latitude, longitude);

                const userLocation: UserLocation = {
                    latitude,
                    longitude,
                    village: geocoded.village,
                    district: geocoded.district,
                    state: geocoded.state,
                    pincode: geocoded.pincode,
                };

                // Save to Supabase profiles table
                await supabase
                    .from("profiles")
                    .update({
                        latitude,
                        longitude,
                        village: geocoded.village,
                        district: geocoded.district,
                        state: geocoded.state,
                        pincode: geocoded.pincode,
                    })
                    .eq("user_id", userId);

                setLocation(userLocation);
                setLoading(false);
                return userLocation;
            } catch (err: any) {
                const message =
                    err.code === 1
                        ? "Location permission denied"
                        : err.code === 2
                            ? "Location unavailable"
                            : err.code === 3
                                ? "Location request timed out"
                                : err.message || "Failed to get location";
                setError(message);
                setLoading(false);
                return null;
            }
        },
        []
    );

    return { location, loading, error, detectAndSaveLocation };
}
