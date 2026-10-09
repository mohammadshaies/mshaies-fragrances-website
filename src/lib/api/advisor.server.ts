import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { safeFetch } from "../security/ssrf.server";

const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "llama3.2";

function isOllamaEnabled() {
  return process.env.OLLAMA_ENABLED?.trim().toLowerCase() !== "false" &&
    (process.env.NODE_ENV !== "production" || process.env.OLLAMA_ENABLED === "true");
}

/** Ollama is restricted to loopback so this server function cannot become a proxy. */
async function fetchOllamaReply(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
) {
  if (!isOllamaEnabled()) return null;

  const configuredUrl = process.env.OLLAMA_BASE_URL?.trim() || DEFAULT_OLLAMA_URL;
  let baseUrl: URL;
  try {
    baseUrl = new URL(configuredUrl);
  } catch {
    console.warn("[chatAdvisorServerFn] Invalid OLLAMA_BASE_URL.");
    return null;
  }

  const isLoopback = baseUrl.hostname === "localhost" ||
    baseUrl.hostname === "127.0.0.1" ||
    baseUrl.hostname === "::1" ||
    baseUrl.hostname === "[::1]";
  if (baseUrl.protocol !== "http:" || !isLoopback) {
    console.warn("[chatAdvisorServerFn] Ollama must use an HTTP loopback URL.");
    return null;
  }

  baseUrl.pathname = `${baseUrl.pathname.replace(/\/$/, "")}/api/chat`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL?.trim() || DEFAULT_OLLAMA_MODEL,
        messages,
        stream: false,
        options: { temperature: 0.7, num_predict: 250 },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`[chatAdvisorServerFn] Ollama returned HTTP ${response.status}.`);
      return null;
    }

    const responseData = await response.json() as { message?: { content?: string } };
    const reply = responseData.message?.content?.trim();
    return reply && reply.length > 5 ? reply : null;
  } catch (err) {
    console.warn("[chatAdvisorServerFn] Ollama is unavailable:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const AUTHORITATIVE_SYSTEM_PROMPT =
  "You are Sentry, the Master Scent Sommelier & Luxury Concierge for M.shaies Haute Parfumerie in Lahore, Pakistan.\n" +
  "You assist clients with bespoke attar choices, Extrait perfumes, olfactory notes breakdown, and gift pairings.\n" +
  "Tone: Warm, dignified, poetic, knowledgeable, hospitable (Pakistani luxury fragrance house etiquette). Provide elegant, helpful guidance in 2-4 sentences.";

export const chatAdvisorServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      history: z.array(
        z.object({
          sender: z.enum(["ai", "user"]),
          text: z.string().max(1000),
        })
      ).max(20),
      message: z.string().min(1).max(500),
    })
  )
  .handler(async ({ data }) => {
    const promptContext = data.history
      .slice(-4)
      .map((m) => `${m.sender}: ${m.text.slice(0, 300)}`)
      .join("\n");
    const cleanMessage = data.message.trim().slice(0, 500);
    const ollamaReply = await fetchOllamaReply([
      {
        role: "system",
        content: AUTHORITATIVE_SYSTEM_PROMPT,
      },
      ...(promptContext ? [{ role: "user" as const, content: `Conversation context:\n${promptContext}` }] : []),
      { role: "user", content: cleanMessage },
    ]);

    if (ollamaReply) {
      return { success: true, reply: ollamaReply, provider: "ollama" as const };
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (apiKey && apiKey.length > 10 && !apiKey.includes("your-gemini-api-key")) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        // Sanitize history and context
        // Utilize safeFetch with strict host whitelist and SSRF protections
        const res = await safeFetch(
          geminiUrl,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `You are Sentry, the Master Scent Sommelier & Luxury Concierge for M.shaies Haute Parfumerie in Lahore, Pakistan.
You assist clients with bespoke attar choices, Extrait perfumes, notes breakdown, and gift pairings.
Tone: Warm, dignified, poetic, knowledgeable, hospitable (Pakistani luxury fragrance house etiquette).

Conversation Context:
${promptContext}
Customer: ${cleanMessage}
Your advice:`,
                    },
                  ],
                },
              ],
              generationConfig: { maxOutputTokens: 250, temperature: 0.7 },
            }),
          },
          {
            allowedHosts: ["generativelanguage.googleapis.com"],
            allowedProtocols: ["https:"],
            timeoutMs: 6000,
          }
        );

        if (res.ok) {
          const resData = await res.json();
          const reply = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply && reply.trim().length > 5) {
            return { success: true, reply: reply.trim() };
          }
        }
      } catch (err) {
        console.warn("[chatAdvisorServerFn] Gemini API call failed:", err);
      }
    }

    return { success: false, error: "Server AI fallback to client sommelier engine." };
  });
