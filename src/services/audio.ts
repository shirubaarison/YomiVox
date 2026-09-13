import { VOICEVOX_BASE } from "../config.js";

const audioCache = new Map<string, string>();
const MAX_CACHE_SIZE = 10;

export async function generateAudioDataUrl(
  text: string,
  speakerId: number,
): Promise<string> {
  const cacheKey = `${speakerId}:${text}`;
  if (audioCache.has(cacheKey)) {
    console.log("Using cached audio for:", text);

    const cachedUrl = audioCache.get(cacheKey)!;

    // move to the end to maintain LRU order
    audioCache.delete(cacheKey);
    audioCache.set(cacheKey, cachedUrl);

    return cachedUrl;
  }

  console.log("Starting synthesis for:", text);

  const queryRes = await fetch(
    `${VOICEVOX_BASE}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`,
    { method: "POST" },
  );

  if (!queryRes.ok) {
    console.error(`audio_query failed with status ${queryRes.status}`);

    const textResponse = await queryRes.text();

    console.error("Error details:", textResponse);

    throw new Error(
      "Failed to generate audio query. If this error persists, please try restarting the Voicevox Engine.",
    );
  }

  const query: unknown = await queryRes.json();
  console.log("audio_query response:", query);

  const audioRes = await fetch(
    `${VOICEVOX_BASE}/synthesis?speaker=${speakerId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    },
  );

  if (!audioRes.ok) {
    console.error(`synthesis failed with status ${audioRes.status}`);

    const textResponse = await audioRes.text();

    console.error("Error details:", textResponse);

    throw new Error(
      "Failed to synthesize audio. If this error persists, please try restarting the Voicevox Engine.",
    );
  }

  console.log("synthesis status:", audioRes.status);

  const blob = await audioRes.blob();

  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  console.log("data url created");

  audioCache.set(cacheKey, dataUrl);
  if (audioCache.size > MAX_CACHE_SIZE) {
    const firstKey = audioCache.keys().next().value;

    if (firstKey) audioCache.delete(firstKey);
  }

  return dataUrl;
}
