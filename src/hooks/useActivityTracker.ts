import { useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to track user activity for personalized feed scoring.
 * Debounced — views are only tracked once per product per session.
 */
export function useActivityTracker() {
    const { user } = useAuth();
    const viewedRef = useRef<Set<string>>(new Set());
    const cartedRef = useRef<Set<string>>(new Set());

    const trackView = useCallback(
        async (productId: string, category: string) => {
            if (!user || viewedRef.current.has(productId)) return;
            viewedRef.current.add(productId);

            try {
                await supabase.from("user_activity" as any).insert({
                    user_id: user.id,
                    product_id: productId,
                    category,
                    action_type: "view",
                } as any);

                // Also increment view_count on the product (fire and forget)
                supabase.rpc("increment_view_count" as any, {
                    p_product_id: productId,
                } as any);
            } catch {
                // Silent fail — activity tracking should never block the UI
            }
        },
        [user]
    );

    const trackAddToCart = useCallback(
        async (productId: string, category: string) => {
            if (!user || cartedRef.current.has(productId)) return;
            cartedRef.current.add(productId);

            try {
                await supabase.from("user_activity" as any).insert({
                    user_id: user.id,
                    product_id: productId,
                    category,
                    action_type: "add_to_cart",
                } as any);
            } catch {
                // Silent fail
            }
        },
        [user]
    );

    const trackPurchase = useCallback(
        async (productId: string, category: string) => {
            if (!user) return;

            try {
                await supabase.from("user_activity" as any).insert({
                    user_id: user.id,
                    product_id: productId,
                    category,
                    action_type: "buy",
                } as any);
            } catch {
                // Silent fail
            }
        },
        [user]
    );

    return { trackView, trackAddToCart, trackPurchase };
}
