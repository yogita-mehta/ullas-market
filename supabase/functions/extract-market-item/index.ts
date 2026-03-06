import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function respond(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Gemini Multimodal Extraction (Audio -> JSON)
// ---------------------------------------------------------------------------
async function extractWithGemini(apiKey: string, audioFile: File): Promise<{ transcript: string, extracted: Record<string, unknown> }> {
  console.log(`[Gemini] Processing audio: type=${audioFile.type}, size=${audioFile.size} bytes`);

  const arrayBuffer = await audioFile.arrayBuffer();
  const base64Audio = encodeBase64(arrayBuffer);
  const mimeType = audioFile.type || "audio/webm";

  const systemInstruction = `You are a product listing assistant for "Ullas Market", an Indian homemade food marketplace.
A seller has described their product by voice. Provide the exact transcript of what they said, and then extract the product details into structured JSON.
Return ONLY valid JSON with no markdown formatting. Follow this schema exactly:
{
  "transcript": "Exact transcript of the audio in its original language, or translated if requested",
  "official_name": "English standardized product name",
  "local_name": "Name exactly as spoken in local language",
  "short_description": "One-line English description",
  "full_description": "2-3 sentences with ingredients/taste/origin",
  "price": <number in INR, 0 if not mentioned>,
  "quantity": <number of units available, 0 if not mentioned>,
  "unit": "packet/kg/piece/box/litre",
  "category": "Snacks|Pickles|Sweets|Spices|Ready-to-Eat|Beverages|Dairy|Grains",
  "language": "ISO 639-1 code e.g. ml/ta/hi/en",
  "dialect_detected": "Malayalam/Tamil/Hindi/English",
  "ai_confidence": <0.0 to 1.0>
}`;

  const body = {
    system_instruction: {
      parts: { text: systemInstruction }
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio
            }
          },
          {
            text: "Listen to this audio and extract the product information."
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json"
    }
  };

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API returned ${res.status}: ${errorText.slice(0, 300)}`);
  }

  const data = await res.json();
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textContent) {
    throw new Error("Gemini returned empty response");
  }

  const parsed = JSON.parse(textContent);
  console.log(`[Gemini] Extracted: "${parsed.official_name}" / price=${parsed.price} / lang=${parsed.dialect_detected}`);
  return { transcript: parsed.transcript || "(No transcript)", extracted: parsed };
}

// ---------------------------------------------------------------------------
// Dish dictionary cache
// ---------------------------------------------------------------------------
async function checkDishCache(localName: string) {
  if (!localName) return null;
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data } = await sb
      .from("dish_dictionary")
      .select("official_name, short_description, category")
      .ilike("local_name", localName.trim())
      .maybeSingle();
    if (data) console.log(`[Cache] Hit: "${localName}" → "${data.official_name}"`);
    return data;
  } catch (e) {
    console.warn("[Cache] lookup failed:", (e as Error).message);
    return null;
  }
}

function saveDishCacheAsync(extracted: Record<string, unknown>) {
  if (!extracted.local_name) return;
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    sb.from("dish_dictionary").upsert({
      local_name: extracted.local_name,
      official_name: extracted.official_name,
      short_description: extracted.short_description,
      category: extracted.category,
    }, { onConflict: "local_name" }).then(() => { }).catch((e: Error) => {
      console.warn("[Cache] save failed:", e.message);
    });
  } catch (e) {
    console.warn("[Cache] save error:", (e as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return respond({ error: "Method not allowed" }, 405);
  }

  try {
    // 1. Check API key (Now checking GEMINI_API_KEY)
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("[extract-market-item] GEMINI_API_KEY not set!");
      return respond({ error: "Server config error: GEMINI_API_KEY missing" }, 500);
    }

    // 2. Parse FormData
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (e) {
      console.error("[extract-market-item] FormData parse failed:", (e as Error).message);
      return respond({ error: "Failed to parse request. Send audio as multipart/form-data with field 'audio'" }, 400);
    }

    // 3. Get the audio file — accept both "audio" and "file" field names
    const file = (formData.get("audio") || formData.get("file")) as File | null;

    if (!file) {
      console.error("[extract-market-item] No audio field in FormData. Keys:", [...formData.keys()].join(", "));
      return respond({ error: "No audio file provided. Send FormData with field name 'audio'" }, 400);
    }

    if (!(file instanceof File)) {
      return respond({ error: "Field 'audio' must be a File/Blob" }, 400);
    }

    console.log(`[extract-market-item] File type: ${file.type}`);
    console.log(`[extract-market-item] File size: ${file.size} bytes`);
    console.log(`[extract-market-item] File name: ${file.name}`);

    // 4. Validate
    if (file.size < 100) {
      return respond({ error: "Audio is empty (< 100 bytes) — recording may have failed" }, 400);
    }
    if (file.size > 20_000_000) { // Gemini max inline limit is ~20MB
      return respond({ error: "Audio too large (max 20MB)" }, 413);
    }

    // 5. Extract via Gemini
    let transcript: string;
    let extracted: Record<string, unknown>;
    try {
      const result = await extractWithGemini(apiKey, file);
      transcript = result.transcript;
      extracted = result.extracted;
    } catch (err) {
      console.error("[Gemini] Failed:", (err as Error).message);
      return respond({
        error: "Voice AI processing failed",
        details: (err as Error).message,
      }, 500);
    }

    // 6. Check cache
    const cached = await checkDishCache(String(extracted.local_name || ""));
    if (cached) {
      extracted.official_name = cached.official_name;
      if (!extracted.short_description) extracted.short_description = cached.short_description;
      if (!extracted.category) extracted.category = cached.category;
    } else {
      saveDishCacheAsync(extracted);
    }

    // 7. Detect missing fields
    const missing: string[] = [];
    if (!extracted.price || extracted.price === 0) missing.push("price");
    if (!extracted.quantity || extracted.quantity === 0) missing.push("quantity");
    if (!extracted.official_name) missing.push("official_name");

    if (missing.length > 0) {
      console.log(`[extract-market-item] Missing fields: ${missing.join(", ")}`);
    }

    console.log(`[extract-market-item] Success — returning result`);

    return respond({
      success: true,
      transcript,
      official_name: String(extracted.official_name || ""),
      local_name: String(extracted.local_name || ""),
      short_description: String(extracted.short_description || ""),
      full_description: String(extracted.full_description || ""),
      price: Number(extracted.price) || 0,
      quantity: Number(extracted.quantity) || 0,
      unit: String(extracted.unit || "piece"),
      category: String(extracted.category || "Snacks"),
      language: String(extracted.language || "en"),
      dialect_detected: String(extracted.dialect_detected || "Unknown"),
      ai_confidence: Number(extracted.ai_confidence) || 0.5,
      missing_fields: missing.length > 0 ? missing : undefined,
    });

  } catch (err) {
    console.error("[extract-market-item] Unhandled error:", (err as Error).stack ?? (err as Error).message);
    return respond({
      error: "Internal Server Error",
      message: (err as Error).message,
    }, 500);
  }
});
