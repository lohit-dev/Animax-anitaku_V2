import { AnikotoEpisodesResponse, AnikotoStreamResponse } from '~/types';

// Hugging Face remains the source of playable episode availability and streams.
// AniList supplies the catalogue and rich metadata in AniListService.ts.
const ANIKOTO_BASE_URL = 'https://dainsleif6284-anikoto-api.hf.space';
const STREAM_REQUEST_TIMEOUT_MS = 15_000;

async function fetchAbsoluteData<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STREAM_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Anime service request failed (${response.status}).`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Anime service request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const fetchAnimeEpisode = async (slug: string): Promise<AnikotoEpisodesResponse> => {
  return await fetchAbsoluteData<AnikotoEpisodesResponse>(
    `${ANIKOTO_BASE_URL}/api/anime/episodes/${encodeURIComponent(slug)}`
  );
};

export const fetchAnimeStreamingLink = async (
  slug: string,
  episodeNumber: string
): Promise<AnikotoStreamResponse> => {
  return await fetchAbsoluteData<AnikotoStreamResponse>(
    `${ANIKOTO_BASE_URL}/api/anime/stream/${encodeURIComponent(slug)}/${encodeURIComponent(episodeNumber)}`
  );
};
