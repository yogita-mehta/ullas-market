import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Invoke a Supabase Edge Function with the user's access token
 * explicitly in the Authorization header.
 *
 * Use this instead of `supabase.functions.invoke()` to avoid 401 errors.
 */
export async function invokeEdgeFunction<T = unknown>(
    functionName: string,
    body: Record<string, unknown>
): Promise<{ data: T | null; error: { message: string } | null }> {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    const res = await fetch(
        `${SUPABASE_URL}/functions/v1/${functionName}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session?.access_token}`,
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify(body),
        }
    );

    let data: T | null = null;
    try {
        data = await res.json();
    } catch {
        // Response wasn't JSON
    }

    if (!res.ok) {
        return {
            data,
            error: { message: (data as any)?.error || `HTTP ${res.status}` },
        };
    }

    return { data, error: null };
}
