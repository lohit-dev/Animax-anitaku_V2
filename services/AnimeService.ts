import {
  AnikotoHomeResponse,
  SearchParams,
  AnikotoSearchResponse,
  AnikotoDetailsResponse,
  AnikotoEpisodesResponse,
  AnikotoStreamResponse,
} from '~/types';

const ANIKOTO_BASE_URL = 'https://dainsleif6284-anikoto-api.hf.space';

async function fetchAbsoluteData<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Error fetching data from ${url}`);
  }

  return response.json();
}

export const fetchHealth = async (): Promise<any> => {
  return await fetchAbsoluteData<any>(`${ANIKOTO_BASE_URL}/health`);
};

export const fetchHomePage = async (): Promise<AnikotoHomeResponse> => {
  return await fetchAbsoluteData<AnikotoHomeResponse>(`${ANIKOTO_BASE_URL}/api/anime/home`);
};

export const fetchSearchDetails = async (params: SearchParams): Promise<AnikotoSearchResponse> => {
  const { q, filters, page = 1 } = params;

  const queryParams = new URLSearchParams({
    q,
    page: String(page),
    sort: filters?.sort || 'default',
  });

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (!value || key === 'sort') {
        return;
      }

      if (key === 'genres') {
        queryParams.append('genre[]', value);
        return;
      }

      if (key === 'season') {
        queryParams.append('season[]', value);
        return;
      }

      if (key === 'language') {
        queryParams.append('language[]', value);
        return;
      }

      if (key === 'status') {
        queryParams.append('status[]', value);
        return;
      }

      if (key === 'rated') {
        queryParams.append('rating[]', value);
        return;
      }

      if (key === 'type') {
        queryParams.append('term_type[]', value);
        return;
      }

      if (key === 'start_date') {
        queryParams.append('year[]', value);
      }
    });
  }

  return await fetchAbsoluteData<AnikotoSearchResponse>(
    `${ANIKOTO_BASE_URL}/api/anime/search?${queryParams.toString()}`
  );
};

export const fetchAnimeById = async (slug: string): Promise<AnikotoDetailsResponse> => {
  return await fetchAbsoluteData<AnikotoDetailsResponse>(
    `${ANIKOTO_BASE_URL}/api/anime/details/${slug}`
  );
};

export const fetchAnimeEpisode = async (slug: string): Promise<AnikotoEpisodesResponse> => {
  return await fetchAbsoluteData<AnikotoEpisodesResponse>(
    `${ANIKOTO_BASE_URL}/api/anime/episodes/${slug}`
  );
};

export const fetchAnimeStreamingLink = async (
  slug: string,
  episodeNumber: string
): Promise<AnikotoStreamResponse> => {
  return await fetchAbsoluteData<AnikotoStreamResponse>(
    `${ANIKOTO_BASE_URL}/api/anime/stream/${slug}/${episodeNumber}`
  );
};
