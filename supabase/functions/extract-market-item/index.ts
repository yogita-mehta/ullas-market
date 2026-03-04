import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExtractedItem {
  official_name: string;
  local_name: string;
  short_description: string;
  full_description: string;
  price: number;
  unit: string;
  quantity: number;
  category: string;
  language: string;
  dialect_detected: string;
  ai_confidence: number;
}

interface DishCacheRow {
  official_name: string;
  local_name: string;
  short_description: string;
  category: string;
}

// ---------------------------------------------------------------------------
// Helpers
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

function base64ToUint8Array(base64: string): Uint8Array {
  const cleaned = base64.replace(/^data:audio\/[a-zA-Z0-9.+-]+;base64,/, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ---------------------------------------------------------------------------
// OpenAI calls
// ---------------------------------------------------------------------------

async function transcribeWithWhisper(
  apiKey: string,
  audioBase64: string
): Promise<string> {
  const form = new FormData();
  const audioBytes = base64ToUint8Array(audioBase64);
  const audioBlob = new Blob([audioBytes], { type: "audio/webm" });
  form.append("file", audioBlob, "input.webm");
  form.append("model", "whisper-1");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Whisper API error (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  return data.text?.trim() || "";
}

async function extractStructuredJson(
  apiKey: string,
  text: string
): Promise<ExtractedItem> {
  const schema = {
    name: "market_item_extraction",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        official_name: {
          type: "string",
          description:
            "Standardized English product/dish name suitable for a marketplace listing",
        },
        local_name: {
          type: "string",
          description:
            "Original local/regional name as spoken by the seller",
        },
        short_description: {
          type: "string",
          description:
            "A concise one-line product description for buyers (in English)",
        },
        full_description: {
          type: "string",
          description:
            "A detailed 2-3 sentence product description including ingredients, taste, and origin when possible (in English)",
        },
        price: { type: "number", description: "Price in Indian Rupees" },
        unit: {
          type: "string",
          description: "Unit of sale, e.g. packet, kg, piece, box",
        },
        quantity: {
          type: "number",
          description: "Number of units available in stock",
        },
        category: {
          type: "string",
          enum: ["Snacks", "Pickles", "Sweets", "Spices", "Ready-to-Eat"],
          description: "Product category",
        },
        language: {
          type: "string",
          description: "ISO 639-1 code of detected language, e.g. ml, ta, hi",
        },
        dialect_detected: {
          type: "string",
          description:
            "Human-readable name of the language/dialect, e.g. Malayalam, Tamil",
        },
        ai_confidence: {
          type: "number",
          description:
            "Confidence score from 0 to 1 indicating how confident the AI is about the extraction accuracy",
        },
      },
      required: [
        "official_name",
        "local_name",
        "short_description",
        "full_description",
        "price",
        "unit",
        "quantity",
        "category",
        "language",
        "dialect_detected",
        "ai_confidence",
      ],
    },
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0,
      response_format: { type: "json_schema", json_schema: schema },
      messages: [
        {
          role: "system",
          content: `You are an AI assistant for an Indian homemade food marketplace called "Ullas Market".
A seller has dictated product information via voice (possibly in Malayalam, Tamil, Hindi, or another Indian language).

Your job:
1. Extract structured product information from the transcript.
2. Standardize the dish/product name into a proper English marketplace listing name (official_name).
3. Preserve the original local name exactly as spoken (local_name).
4. Write a short, appealing one-line English description for buyers (short_description).
5. Write a detailed 2-3 sentence description including ingredients, taste, and origin when possible (full_description).
6. Detect the language and dialect.
7. Pick the most appropriate category from: Snacks, Pickles, Sweets, Spices, Ready-to-Eat.
8. If price or quantity are not mentioned, use 0.
9. Provide an ai_confidence score (0-1) reflecting how confident you are in the extraction accuracy. Use lower values when the audio transcript is ambiguous or incomplete.

Return ONLY valid JSON matching the schema.`,
        },
        { role: "user", content: text },
      ],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`GPT API error (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || "{}";
  return JSON.parse(content) as ExtractedItem;
}

// ---------------------------------------------------------------------------
// Dish dictionary cache helpers
// ---------------------------------------------------------------------------

function getSupabaseServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

async function lookupDishCache(
  localName: string
): Promise<DishCacheRow | null> {
  const sb = getSupabaseServiceClient();
  if (!sb) return null;

  const { data } = await sb
    .from("dish_dictionary")
    .select("official_name, local_name, short_description, category")
    .ilike("local_name", localName)
    .maybeSingle();

  return data as DishCacheRow | null;
}

async function storeDishCache(item: ExtractedItem): Promise<void> {
  const sb = getSupabaseServiceClient();
  if (!sb) return;

  await sb.from("dish_dictionary").upsert(
    {
      local_name: item.local_name,
      official_name: item.official_name,
      short_description: item.short_description,
      category: item.category,
    },
    { onConflict: "local_name" }
  );
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return json({ error: "Missing OpenAI API key on server" }, 500);
  }

  try {
    const body = await req.json();
    const speechTranscript: string | undefined = body.speechTranscript;

    if (!speechTranscript) {
      return json({ error: "No audio provided (speechTranscript field required)" }, 400);
    }

    // Validate audio size (base64 is ~33 % larger than raw bytes)
    const estimatedBytes = (speechTranscript.length * 3) / 4;
    if (estimatedBytes > MAX_AUDIO_SIZE_BYTES) {
      return json(
        { error: `Audio too large. Maximum size is ${MAX_AUDIO_SIZE_BYTES / 1024 / 1024} MB.` },
        413
      );
    }

    // Step 1: Transcribe with Whisper
    const transcriptText = await transcribeWithWhisper(apiKey, speechTranscript);

    if (!transcriptText) {
      return json({ error: "Could not transcribe audio — no speech detected" }, 422);
    }

    // Step 2: Try dish cache first
    // We do a rough first-pass: use the full transcript as a lookup key.
    // This isn't perfect but catches repeated identical dictations.
    // The real cache lookup happens after we get local_name from GPT.

    // Step 3: Extract structured info via GPT
    let extracted: ExtractedItem;
    try {
      extracted = await extractStructuredJson(apiKey, transcriptText);
    } catch (gptError) {
      // If GPT fails, still return the transcript so the seller can fill manually
      return json({
        transcript: transcriptText,
        error: "AI extraction failed — please fill the form manually",
        details: (gptError as Error).message,
      });
    }

    // Step 4: Check dish cache for the extracted local_name
    const cached = await lookupDishCache(extracted.local_name);
    if (cached) {
      // Use cached standardized values (but keep price/quantity from this extraction)
      extracted.official_name = cached.official_name;
      extracted.short_description = cached.short_description || extracted.short_description;
      extracted.category = cached.category || extracted.category;
    } else {
      // Store in cache for future lookups
      await storeDishCache(extracted);
    }

    // Return the full result
    return json({
      transcript: transcriptText,
      official_name: extracted.official_name,
      local_name: extracted.local_name,
      short_description: extracted.short_description,
      full_description: extracted.full_description,
      price: extracted.price,
      quantity: extracted.quantity,
      unit: extracted.unit,
      category: extracted.category,
      language: extracted.language,
      dialect_detected: extracted.dialect_detected,
      ai_confidence: extracted.ai_confidence,
    });
  } catch (err) {
    return json(
      { error: "Processing failed", details: (err as Error).message },
      500
    );
  }
});
