import "https://esm.sh/@supabase/supabase-js@2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Types & Helpers
// ---------------------------------------------------------------------------

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

interface RiskFlag {
    seller_id: string;
    flag_type: string;
    details: string;
    severity: string;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) {
        return json({ error: "Missing Supabase configuration" }, 500);
    }

    try {
        const sb = createClient(url, serviceKey);
        const newFlags: RiskFlag[] = [];

        // --- 1. Price anomaly detection ---
        // Get category averages
        const { data: products } = await sb
            .from("products")
            .select("id, seller_id, name, price, category, created_at")
            .eq("is_active", true)
            .gt("price", 0);

        if (products && products.length > 0) {
            // Compute category averages
            const categoryPrices: Record<string, number[]> = {};
            for (const p of products) {
                if (!categoryPrices[p.category]) categoryPrices[p.category] = [];
                categoryPrices[p.category].push(p.price);
            }

            const categoryAvg: Record<string, number> = {};
            for (const [cat, prices] of Object.entries(categoryPrices)) {
                categoryAvg[cat] = prices.reduce((s, p) => s + p, 0) / prices.length;
            }

            // Flag products with extreme price deviation
            for (const p of products) {
                const avg = categoryAvg[p.category];
                if (avg && (p.price > avg * 3 || p.price < avg * 0.2)) {
                    newFlags.push({
                        seller_id: p.seller_id,
                        flag_type: "price_anomaly",
                        details: `Product "${p.name}" priced at ₹${p.price} vs category avg ₹${Math.round(avg)} (${p.category})`,
                        severity: p.price > avg * 5 ? "high" : "medium",
                    });
                }
            }

            // --- 3. Bulk upload detection ---
            // Count products created per seller in last 24 hours
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const recentProducts = products.filter((p) => p.created_at >= oneDayAgo);
            const sellerCounts: Record<string, number> = {};
            for (const p of recentProducts) {
                sellerCounts[p.seller_id] = (sellerCounts[p.seller_id] || 0) + 1;
            }

            for (const [sellerId, count] of Object.entries(sellerCounts)) {
                if (count > 10) {
                    newFlags.push({
                        seller_id: sellerId,
                        flag_type: "bulk_upload",
                        details: `${count} products created in last 24 hours`,
                        severity: count > 20 ? "high" : "medium",
                    });
                }
            }
        }

        // --- 2. Negative review detection ---
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: negativeReviews } = await sb
            .from("reviews")
            .select("product_id, rating, products(seller_id)")
            .lte("rating", 2)
            .gte("created_at", thirtyDaysAgo);

        if (negativeReviews && negativeReviews.length > 0) {
            const sellerNegatives: Record<string, number> = {};
            for (const r of negativeReviews) {
                const sellerId = (r.products as any)?.seller_id;
                if (sellerId) {
                    sellerNegatives[sellerId] = (sellerNegatives[sellerId] || 0) + 1;
                }
            }

            for (const [sellerId, count] of Object.entries(sellerNegatives)) {
                if (count >= 3) {
                    newFlags.push({
                        seller_id: sellerId,
                        flag_type: "negative_reviews",
                        details: `${count} negative reviews (≤2 stars) in last 30 days`,
                        severity: count >= 5 ? "high" : "medium",
                    });
                }
            }
        }

        // --- 4. Insert new flags ---
        if (newFlags.length > 0) {
            // Check for existing unresolved flags to avoid duplicates
            const { data: existingFlags } = await sb
                .from("risk_flags")
                .select("seller_id, flag_type")
                .eq("resolved", false);

            const existingSet = new Set(
                (existingFlags || []).map((f) => `${f.seller_id}:${f.flag_type}`)
            );

            const uniqueNewFlags = newFlags.filter(
                (f) => !existingSet.has(`${f.seller_id}:${f.flag_type}`)
            );

            if (uniqueNewFlags.length > 0) {
                await sb.from("risk_flags").insert(uniqueNewFlags);
            }
        }

        // --- 5. Update trust scores ---
        // Get all sellers with unresolved flags
        const { data: allFlags } = await sb
            .from("risk_flags")
            .select("seller_id, severity")
            .eq("resolved", false);

        if (allFlags && allFlags.length > 0) {
            const sellerDeductions: Record<string, number> = {};
            for (const f of allFlags) {
                const deduction =
                    f.severity === "high" ? 20 : f.severity === "medium" ? 10 : 5;
                sellerDeductions[f.seller_id] =
                    (sellerDeductions[f.seller_id] || 0) + deduction;
            }

            for (const [sellerId, totalDeduction] of Object.entries(sellerDeductions)) {
                const trustScore = Math.max(0, 100 - totalDeduction);
                await sb
                    .from("seller_profiles")
                    .update({ trust_score: trustScore })
                    .eq("user_id", sellerId);
            }
        }

        return json({
            success: true,
            new_flags_created: newFlags.length,
            sellers_updated: allFlags?.length || 0,
        });
    } catch (err) {
        return json(
            { error: "Processing failed", details: (err as Error).message },
            500
        );
    }
});
