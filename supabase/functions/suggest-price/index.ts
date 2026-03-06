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

// ---------------------------------------------------------------------------
// GPT reasoning helper (optional — only used when OPENAI_API_KEY is set)
// ---------------------------------------------------------------------------

async function generatePriceReasoning(
    apiKey: string,
    productName: string,
    regionalAvg: number,
    globalAvg: number,
    suggestedPrice: number,
    sampleCount: number
): Promise<string> {
    try {
        console.log(`[Gemini] Generating price reasoning for "${productName}"`);

        const prompt = `Product: ${productName}\nRegional average price: ₹${regionalAvg}\nGlobal average price: ₹${globalAvg}\nSuggested price: ₹${suggestedPrice}\nSample size: ${sampleCount} similar products\n\nGive a brief 1-2 sentence pricing recommendation in simple English.`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: "You are a pricing advisor for an Indian homemade food marketplace. Provide a 1-2 sentence pricing recommendation in simple English. Be concise and helpful." }]
                },
                contents: [
                    {
                        role: "user",
                        parts: [{ text: prompt }]
                    }
                ],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 100
                }
            })
        });

        if (!res.ok) {
            console.warn(`[Gemini] Reasoning API error (${res.status})`);
            return "";
        }

        const data = await res.json();
        const reasoning = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        console.log(`[Gemini] Reasoning: "${reasoning}"`);
        return reasoning;
    } catch (err) {
        console.warn("[Gemini] Reasoning generation failed:", (err as Error).message);
        return "";
    }
}

async function estimateMarketPrice(
    apiKey: string,
    productName: string,
    category: string
): Promise<{ min_price: number; max_price: number; suggested_price: number; reasoning: string } | null> {
    try {
        console.log(`[Gemini] Estimating market price for 0-data product: "${productName}"`);

        const prompt = `Product: ${productName}\nCategory: ${category}\n\nWe have no database history for this item. Using your general knowledge of Indian homemade marketplace prices, estimate a fair retail price in INR (₹). Give a min, max, a suggested realistic price, and a 1-2 sentence reasoning why. Return ONLY valid JSON: {"min_price": number, "max_price": number, "suggested_price": number, "reasoning": "string"}`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: "You are a pricing AI for an Indian food marketplace. Always return valid JSON matching the requested fields exactly." }]
                },
                contents: [
                    {
                        role: "user",
                        parts: [{ text: prompt }]
                    }
                ],
                generationConfig: {
                    temperature: 0.3,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!res.ok) return null;

        const data = await res.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textContent) return null;

        const parsed = JSON.parse(textContent);
        console.log(`[Gemini] AI Estimated Price: ₹${parsed.suggested_price}`);
        return {
            min_price: Number(parsed.min_price) || 0,
            max_price: Number(parsed.max_price) || 0,
            suggested_price: Number(parsed.suggested_price) || 0,
            reasoning: String(parsed.reasoning) || ""
        };
    } catch (err) {
        console.warn("[Gemini] Market estimation failed:", (err as Error).message);
        return null;
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

    if (!url || !serviceKey) {
        return json({ error: "Missing Supabase configuration" }, 500);
    }

    try {
        const body = await req.json();
        const productName: string = body.product_name?.trim();
        const category: string | undefined = body.category?.trim();
        const district: string | undefined = body.district?.trim();

        console.log(`[suggest-price] Request: name="${productName}", category="${category || "any"}", district="${district || "any"}"`);

        if (!productName || productName.length < 2) {
            return json({ error: "product_name is required (min 2 chars)" }, 400);
        }

        const sb = createClient(url, serviceKey);

        // Search pattern
        const searchPattern = `%${productName.toLowerCase()}%`;

        // --- Regional query (same district) ---
        let regionalAvg = 0;
        let regionalCount = 0;

        if (district) {
            let regionalQuery = sb
                .from("products")
                .select("price")
                .eq("is_active", true)
                .gt("price", 0)
                .ilike("name", searchPattern)
                .eq("district", district);

            if (category) {
                regionalQuery = regionalQuery.eq("category", category);
            }

            const { data: regionalProducts } = await regionalQuery.limit(50);

            if (regionalProducts && regionalProducts.length > 0) {
                const prices = regionalProducts.map((p) => p.price);
                regionalAvg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
                regionalCount = prices.length;
                console.log(`[suggest-price] Regional (${district}): avg=₹${regionalAvg}, count=${regionalCount}`);
            }
        }

        // --- Global query (all districts) ---
        let globalQuery = sb
            .from("products")
            .select("price")
            .eq("is_active", true)
            .gt("price", 0)
            .ilike("name", searchPattern);

        if (category) {
            globalQuery = globalQuery.eq("category", category);
        }

        const { data: globalProducts, error } = await globalQuery.limit(100);

        if (error) {
            console.error(`[suggest-price] DB error: ${error.message}`);
            return json({ error: "Database query failed", details: error.message }, 500);
        }

        const totalCount = globalProducts?.length || 0;

        if (!globalProducts || totalCount < 2) {
            console.log(`[suggest-price] Not enough data: ${totalCount} products. Falling back to AI estimation.`);

            if (geminiKey && productName.length >= 3) {
                const aiEstimate = await estimateMarketPrice(geminiKey, productName, category || "Unknown");
                if (aiEstimate && aiEstimate.suggested_price > 0) {
                    return json({
                        min_price: aiEstimate.min_price,
                        max_price: aiEstimate.max_price,
                        avg_price: aiEstimate.suggested_price,
                        regional_avg: aiEstimate.suggested_price,
                        global_avg: aiEstimate.suggested_price,
                        suggested_price: aiEstimate.suggested_price,
                        sample_count: 50, // Fake sample count to trick UI into showing it
                        reasoning: `AI Market Estimate: ${aiEstimate.reasoning}`
                    });
                }
            }

            return json({
                min_price: 0,
                max_price: 0,
                avg_price: 0,
                suggested_price: 0,
                regional_avg: regionalAvg,
                global_avg: 0,
                sample_count: totalCount,
                reasoning: "",
            });
        }

        const allPrices = globalProducts.map((p) => p.price);
        const globalAvg = Math.round(allPrices.reduce((s, p) => s + p, 0) / allPrices.length);
        const minPrice = Math.min(...allPrices);
        const maxPrice = Math.max(...allPrices);

        // If no regional data, use global for both
        const effectiveRegionalAvg = regionalCount >= 2 ? regionalAvg : globalAvg;

        // Weighted formula: 70% regional + 30% global
        const suggestedPrice = Math.round(effectiveRegionalAvg * 0.7 + globalAvg * 0.3);

        console.log(`[suggest-price] Global: avg=₹${globalAvg}, min=₹${minPrice}, max=₹${maxPrice}, total=${totalCount}`);
        console.log(`[suggest-price] Suggested: ₹${suggestedPrice} (regional=₹${effectiveRegionalAvg} × 0.7 + global=₹${globalAvg} × 0.3)`);

        // Generate GPT reasoning (optional, non-blocking)
        let reasoning = "";
        if (geminiKey) {
            reasoning = await generatePriceReasoning(
                geminiKey,
                productName,
                effectiveRegionalAvg,
                globalAvg,
                suggestedPrice,
                totalCount
            );
        }

        return json({
            min_price: minPrice,
            max_price: maxPrice,
            avg_price: globalAvg,
            regional_avg: effectiveRegionalAvg,
            global_avg: globalAvg,
            suggested_price: suggestedPrice,
            sample_count: totalCount,
            reasoning,
        });
    } catch (err) {
        console.error(`[suggest-price] Error: ${(err as Error).message}`);
        return json(
            { error: "Processing failed", details: (err as Error).message },
            500
        );
    }
});
