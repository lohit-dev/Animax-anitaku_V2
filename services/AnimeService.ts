import { AnikotoStreamResponse } from '~/types';

// Streaming intentionally remains on Hugging Face. Catalogue, search, detail,
// and episode metadata are supplied by AniList in AniListService.ts.
const HUGGING_FACE_STREAMING_URL = 'https://dainsleif6284-anikoto-api.hf.space';
const STREAM_REQUEST_TIMEOUT_MS = 15_000;

async function fetchAbsoluteData<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STREAM_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Streaming request failed (${response.status}).`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Streaming request timed out. Please choose another server.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const fetchAnimeStreamingLink = async (
  slug: string,
  episodeNumber: string
): Promise<AnikotoStreamResponse> => {
  return await fetchAbsoluteData<AnikotoStreamResponse>(
    `${HUGGING_FACE_STREAMING_URL}/api/anime/stream/${encodeURIComponent(slug)}/${encodeURIComponent(episodeNumber)}`
  );
};
