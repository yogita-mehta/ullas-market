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
    ai_explanation?: string;
}

// ---------------------------------------------------------------------------
// GPT explanation helper
// ---------------------------------------------------------------------------

async function generateRiskExplanation(
    apiKey: string,
    sellerFlags: RiskFlag[]
): Promise<string> {
    try {
        console.log(`[Gemini] Requesting risk explanation for ${sellerFlags.length} flags...`);
        const flagSummary = sellerFlags
            .map((f) => `- ${f.flag_type}: ${f.details} (${f.severity})`)
            .join("\n");

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: {
                    parts: { text: "You are a trust safety analyst for an Indian food marketplace. Given risk flags, provide a brief 2-3 sentence explanation for admins about why this seller has been flagged. Be professional and factual." }
                },
                contents: [
                    {
                        role: "user",
                        parts: [{ text: `Risk flags for this seller:\n${flagSummary}\n\nExplain the risk assessment.` }]
                    }
                ],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 150
                }
            })
        });

        if (!res.ok) {
            const errBody = await res.text();
            console.error(`[Gemini] API error (${res.status}): ${errBody.slice(0, 300)}`);
            return "";
        }
        const data = await res.json();
        const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        console.log(`[Gemini] Received explanation: "${explanation.slice(0, 50)}..."`);
        return explanation;
    } catch (err) {
        console.error(`[Gemini] Exception during API call: ${(err as Error).message}`);
        return "";
    }
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
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    console.log("[trust-monitor] Request received.");

    if (!url || !serviceKey) {
        console.error("[trust-monitor] Missing Supabase configuration");
        return json({ status: "error", message: "Missing Supabase configuration" }, 500);
    }

    if (!geminiKey) {
        console.warn("[trust-monitor] GEMINI_API_KEY is missing. AI explanations will be skipped.");
    } else {
        console.log("[trust-monitor] GEMINI_API_KEY loaded successfully.");
    }

    try {
        const sb = createClient(url, serviceKey);
        const newFlags: RiskFlag[] = [];

        console.log("[trust-monitor] Starting risk analysis...");

        // --- 1. Price anomaly detection ---
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

            // Flag extreme price deviations
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

            // --- 2. Bulk upload / spam detection ---
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

            // --- 3. Duplicate product name detection ---
            const sellerProductNames: Record<string, Record<string, number>> = {};
            for (const p of products) {
                if (!sellerProductNames[p.seller_id]) sellerProductNames[p.seller_id] = {};
                const normalizedName = p.name.toLowerCase().trim();
                sellerProductNames[p.seller_id][normalizedName] =
                    (sellerProductNames[p.seller_id][normalizedName] || 0) + 1;
            }

            for (const [sellerId, names] of Object.entries(sellerProductNames)) {
                for (const [name, count] of Object.entries(names)) {
                    if (count > 3) {
                        newFlags.push({
                            seller_id: sellerId,
                            flag_type: "duplicate_products",
                            details: `${count} duplicate products named "${name}"`,
                            severity: count > 5 ? "high" : "medium",
                        });
                    }
                }
            }

            console.log(`[trust-monitor] Product-based flags: ${newFlags.length}`);
        }

        // --- 4. Negative review detection ---
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: negativeReviews } = await sb
            .from("reviews")
            .select("product_id, rating, products(seller_id)")
            .lte("rating", 2)
            .gte("created_at", thirtyDaysAgo);

        const sellerNegatives: Record<string, number> = {};
        if (negativeReviews && negativeReviews.length > 0) {
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
            console.log(`[trust-monitor] Negative review flags added`);
        }

        // --- 5. Cancellation rate detection ---
        const { data: allOrders } = await sb
            .from("orders")
            .select("seller_id, status")
            .not("seller_id", "is", null);

        const sellerOrderStats: Record<string, { total: number; cancelled: number }> = {};
        if (allOrders && allOrders.length > 0) {
            for (const o of allOrders) {
                if (!o.seller_id) continue;
                if (!sellerOrderStats[o.seller_id]) {
                    sellerOrderStats[o.seller_id] = { total: 0, cancelled: 0 };
                }
                sellerOrderStats[o.seller_id].total++;
                if (o.status === "cancelled") {
                    sellerOrderStats[o.seller_id].cancelled++;
                }
            }

            for (const [sellerId, stats] of Object.entries(sellerOrderStats)) {
                if (stats.total >= 5) {
                    const cancellationRate = stats.cancelled / stats.total;
                    if (cancellationRate > 0.3) {
                        newFlags.push({
                            seller_id: sellerId,
                            flag_type: "high_cancellation",
                            details: `Cancellation rate ${Math.round(cancellationRate * 100)}% (${stats.cancelled}/${stats.total} orders)`,
                            severity: cancellationRate > 0.5 ? "high" : "medium",
                        });
                    }
                }
            }
            console.log(`[trust-monitor] Cancellation analysis complete`);
        }

        // --- 6. Insert new flags (dedup against existing) ---
        if (newFlags.length > 0) {
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
                // Generate AI explanations for each seller's flags (batch by seller)
                if (geminiKey) {
                    const sellerFlagGroups: Record<string, RiskFlag[]> = {};
                    for (const f of uniqueNewFlags) {
                        if (!sellerFlagGroups[f.seller_id]) sellerFlagGroups[f.seller_id] = [];
                        sellerFlagGroups[f.seller_id].push(f);
                    }

                    for (const [_sellerId, flags] of Object.entries(sellerFlagGroups)) {
                        const explanation = await generateRiskExplanation(geminiKey, flags);
                        if (explanation) {
                            for (const f of flags) {
                                f.ai_explanation = explanation;
                            }
                        }
                    }
                }

                await sb.from("risk_flags").insert(uniqueNewFlags);
                console.log(`[trust-monitor] Inserted ${uniqueNewFlags.length} new flags`);
            }
        }

        // --- 7. Compute risk_score per seller ---
        // Formula: (complaints * 3) + (cancellation_rate_pct * 5 / 100) + (price_anomaly_count * 4)
        const { data: allFlags } = await sb
            .from("risk_flags")
            .select("seller_id, flag_type, severity")
            .eq("resolved", false);

        const sellerScores: Record<string, number> = {};
        if (allFlags && allFlags.length > 0) {
            for (const f of allFlags) {
                if (!sellerScores[f.seller_id]) sellerScores[f.seller_id] = 0;

                switch (f.flag_type) {
                    case "negative_reviews":
                        sellerScores[f.seller_id] += 3 * (f.severity === "high" ? 2 : 1);
                        break;
                    case "high_cancellation":
                        sellerScores[f.seller_id] += 5 * (f.severity === "high" ? 2 : 1);
                        break;
                    case "price_anomaly":
                        sellerScores[f.seller_id] += 4 * (f.severity === "high" ? 2 : 1);
                        break;
                    case "bulk_upload":
                    case "duplicate_products":
                        sellerScores[f.seller_id] += 3 * (f.severity === "high" ? 2 : 1);
                        break;
                    default:
                        sellerScores[f.seller_id] += 2;
                }
            }

            // Update trust_score on seller_profiles
            for (const [sellerId, riskScore] of Object.entries(sellerScores)) {
                const trustScore = Math.max(0, 100 - riskScore);
                await sb
                    .from("seller_profiles")
                    .update({ trust_score: trustScore })
                    .eq("user_id", sellerId);
            }

            console.log(`[trust-monitor] Updated trust scores for ${Object.keys(sellerScores).length} sellers`);
        }

        const totalFlagged = Object.values(sellerScores).filter((s) => s > 15).length;
        console.log(`[trust-monitor] Complete — ${newFlags.length} flags found, ${totalFlagged} sellers above threshold`);

        return json({
            status: "success",
            result: {
                new_flags_created: newFlags.length,
                sellers_updated: Object.keys(sellerScores).length,
                flagged_sellers: totalFlagged,
            }
        });
    } catch (err) {
        console.error(`[trust-monitor] Caught error: ${(err as Error).stack || (err as Error).message}`);
        return json(
            { status: "error", message: (err as Error).message },
            500 // Note: UI typically prefers 200 with {status: "error"} to avoid network panel errors, but 500 is technically correct for server crashes.
        );
    }
});
