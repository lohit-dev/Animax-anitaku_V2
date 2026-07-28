import {
  AniListAnimeDetails,
  AniListEpisode,
  AniListHomeResponse,
  AniListSearchResponse,
  Anime,
  SearchParams,
} from '~/types';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const REQUEST_TIMEOUT_MS = 12_000;

export class AniListRequestError extends Error {
  status: number;
  retryAfterMs?: number;

  constructor(message: string, status: number, retryAfterMs?: number) {
    super(message);
    this.name = 'AniListRequestError';
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

type RawDate = {
  year?: number | null;
  month?: number | null;
  day?: number | null;
};

type RawMedia = {
  id: number;
  idMal?: number | null;
  title?: { romaji?: string | null; english?: string | null; native?: string | null } | null;
  synonyms?: string[] | null;
  coverImage?: { large?: string | null; extraLarge?: string | null } | null;
  description?: string | null;
  averageScore?: number | null;
  format?: string | null;
  status?: string | null;
  season?: string | null;
  seasonYear?: number | null;
  startDate?: RawDate | null;
  episodes?: number | null;
  duration?: number | null;
  genres?: string[] | null;
  popularity?: number | null;
  nextAiringEpisode?: { episode?: number | null } | null;
};

type RawPage = {
  pageInfo: { currentPage: number; hasNextPage: boolean };
  media: RawMedia[];
};

const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english native }
  synonyms
  coverImage { large extraLarge }
  description
  averageScore
  format
  status
  season
  seasonYear
  startDate { year month day }
  episodes
  duration
  genres
  popularity
  nextAiringEpisode { episode }
`;

const HOME_QUERY = `
  query HomeCatalogue {
    spotlight: Page(page: 1, perPage: 10) {
      media(type: ANIME, isAdult: false, sort: [TRENDING_DESC]) { ${MEDIA_FIELDS} }
    }
    airing: Page(page: 1, perPage: 20) {
      media(type: ANIME, isAdult: false, status: RELEASING, sort: [POPULARITY_DESC]) { ${MEDIA_FIELDS} }
    }
    upcoming: Page(page: 1, perPage: 20) {
      media(type: ANIME, isAdult: false, status: NOT_YET_RELEASED, sort: [POPULARITY_DESC]) { ${MEDIA_FIELDS} }
    }
    popular: Page(page: 1, perPage: 20) {
      media(type: ANIME, isAdult: false, sort: [POPULARITY_DESC]) { ${MEDIA_FIELDS} }
    }
    completed: Page(page: 1, perPage: 20) {
      media(type: ANIME, isAdult: false, status: FINISHED, sort: [SCORE_DESC]) { ${MEDIA_FIELDS} }
    }
  }
`;

const SEARCH_QUERY = `
  query SearchAnime(
    $page: Int!
    $search: String!
    $genreIn: [String]
    $formatIn: [MediaFormat]
    $season: MediaSeason
    $status: MediaStatus
    $year: String
    $sort: [MediaSort]
  ) {
    Page(page: $page, perPage: 24) {
      pageInfo { currentPage hasNextPage }
      media(
        type: ANIME
        isAdult: false
        search: $search
        genre_in: $genreIn
        format_in: $formatIn
        season: $season
        status: $status
        startDate_like: $year
        sort: $sort
      ) { ${MEDIA_FIELDS} }
    }
  }
`;

const DETAILS_QUERY = `
  query AnimeDetails($id: Int, $search: String) {
    Media(id: $id, search: $search, type: ANIME) { ${MEDIA_FIELDS} }
  }
`;

const EPISODES_QUERY = `
  query AnimeEpisodes($id: Int!) {
    Media(id: $id, type: ANIME) {
      episodes
      nextAiringEpisode { episode }
    }
  }
`;

const cleanHtml = (value: string | null | undefined) =>
  (value ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const titleOf = (media: RawMedia) =>
  media.title?.english?.trim() ||
  media.title?.romaji?.trim() ||
  media.title?.native?.trim() ||
  'Untitled';

const formatLabel = (value: string | null | undefined) =>
  value ? value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Anime';

const statusLabel = (value: string | null | undefined) => {
  switch (value) {
    case 'RELEASING':
      return 'Currently Airing';
    case 'FINISHED':
      return 'Finished Airing';
    case 'NOT_YET_RELEASED':
      return 'Not Yet Aired';
    case 'HIATUS':
      return 'Hiatus';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return formatLabel(value);
  }
};

const seasonLabel = (media: RawMedia) => {
  if (media.season && media.seasonYear) return `${formatLabel(media.season)} ${media.seasonYear}`;
  if (media.startDate?.year) return String(media.startDate.year);
  return 'TBA';
};

const mapAnime = (media: RawMedia, rank?: number): Anime => ({
  title: titleOf(media),
  slug: String(media.id),
  image: media.coverImage?.extraLarge || media.coverImage?.large || '',
  synopsis: cleanHtml(media.description),
  quality: formatLabel(media.format),
  rating: media.averageScore ? `${(media.averageScore / 10).toFixed(1)}` : 'N/A',
  date: seasonLabel(media),
  type: formatLabel(media.format),
  episode: media.episodes ? `${media.episodes} Episodes` : undefined,
  episodeNumber: media.episodes ? String(media.episodes) : undefined,
  genres: media.genres ?? [],
  rank,
  aniListId: media.id,
  malId: media.idMal ?? null,
});

const mapDetails = (media: RawMedia): AniListAnimeDetails => {
  const titles = [
    media.title?.english,
    media.title?.romaji,
    media.title?.native,
    ...(media.synonyms ?? []),
  ]
    .filter((title): title is string => Boolean(title?.trim()))
    .filter((title, index, values) => values.indexOf(title) === index);

  return {
    id: String(media.id),
    title: titleOf(media),
    alternateTitles: titles.filter((title) => title !== titleOf(media)),
    image: media.coverImage?.extraLarge || media.coverImage?.large || '',
    synopsis: cleanHtml(media.description) || 'No description is available for this anime.',
    rating: media.averageScore ? `${(media.averageScore / 10).toFixed(1)}` : 'N/A',
    quality: formatLabel(media.format),
    genres: media.genres ?? [],
    status: statusLabel(media.status),
    released: seasonLabel(media),
    duration: media.duration ? `${media.duration} min` : 'Unknown duration',
    type: formatLabel(media.format),
    malRating: media.averageScore ? `${media.averageScore}%` : 'N/A',
    aniListId: media.id,
    malId: media.idMal ?? null,
  };
};

const parseRetryAfter = (value: string | null) => {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined;
};

async function queryAniList<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(ANILIST_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });

    const payload = (await response.json()) as { data?: T; errors?: { message?: string }[] };
    const message =
      payload.errors
        ?.map((error) => error.message)
        .filter(Boolean)
        .join(' ') || `AniList request failed (${response.status})`;

    if (!response.ok || payload.errors?.length || !payload.data) {
      throw new AniListRequestError(
        message,
        response.status,
        parseRetryAfter(response.headers.get('Retry-After'))
      );
    }

    return payload.data;
  } catch (error) {
    if (error instanceof AniListRequestError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AniListRequestError('AniList request timed out. Please try again.', 408);
    }
    throw new AniListRequestError(
      error instanceof Error ? error.message : 'Unable to reach AniList.',
      0
    );
  } finally {
    clearTimeout(timeout);
  }
}

export const fetchAniListHomePage = async (): Promise<AniListHomeResponse> => {
  const data = await queryAniList<{
    spotlight: Pick<RawPage, 'media'>;
    airing: Pick<RawPage, 'media'>;
    upcoming: Pick<RawPage, 'media'>;
    popular: Pick<RawPage, 'media'>;
    completed: Pick<RawPage, 'media'>;
  }>(HOME_QUERY);

  return {
    data: {
      spotlight: data.spotlight.media.map((media, index) => mapAnime(media, index + 1)),
      recentUpdates: data.airing.media.map(mapAnime),
      upcoming: data.upcoming.media.map(mapAnime),
      topTables: {
        newReleases: data.airing.media.map(mapAnime),
        newlyAdded: data.popular.media.map(mapAnime),
        justCompleted: data.completed.media.map(mapAnime),
      },
    },
  };
};

const toFormat = (value?: string) => (value ? value.replace(/\s+/g, '_').toUpperCase() : undefined);

const toStatus = (value?: string) => {
  if (!value) return undefined;
  if (value === 'Currently Airing') return 'RELEASING';
  if (value === 'Finished Airing') return 'FINISHED';
  if (value === 'Not yet aired') return 'NOT_YET_RELEASED';
  return toFormat(value);
};

const toSort = (value?: string) => {
  switch (value?.toLowerCase()) {
    case 'score':
    case 'score_desc':
      return ['SCORE_DESC'];
    case 'title':
    case 'title_romaji':
      return ['TITLE_ROMAJI'];
    case 'newest':
    case 'start_date_desc':
      return ['START_DATE_DESC'];
    default:
      return ['POPULARITY_DESC'];
  }
};

export const fetchAniListSearch = async (params: SearchParams): Promise<AniListSearchResponse> => {
  const filters = params.filters;
  const data = await queryAniList<{ Page: RawPage }>(SEARCH_QUERY, {
    page: params.page ?? 1,
    search: params.q.trim(),
    genreIn: filters?.genres ? [filters.genres] : undefined,
    formatIn: filters?.type ? [toFormat(filters.type)] : undefined,
    season: toFormat(filters?.season),
    status: toStatus(filters?.status),
    year: filters?.start_date,
    sort: toSort(filters?.sort || filters?.score),
  });

  return {
    results: data.Page.media.map(mapAnime),
    pagination: {
      currentPage: data.Page.pageInfo.currentPage,
      hasNextPage: data.Page.pageInfo.hasNextPage,
    },
  };
};

export const fetchAniListAnimeById = async (identifier: string): Promise<AniListAnimeDetails> => {
  const numericId = Number(identifier);
  const data = await queryAniList<{ Media: RawMedia | null }>(DETAILS_QUERY, {
    id: Number.isInteger(numericId) && numericId > 0 ? numericId : undefined,
    search:
      Number.isInteger(numericId) && numericId > 0 ? undefined : identifier.replace(/-/g, ' '),
  });

  if (!data.Media) throw new AniListRequestError('Anime not found on AniList.', 404);
  return mapDetails(data.Media);
};

export const fetchAniListEpisodes = async (animeId: string): Promise<AniListEpisode[]> => {
  const id = Number(animeId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AniListRequestError('An AniList ID is required to load episodes.', 400);
  }

  const data = await queryAniList<{
    Media: Pick<RawMedia, 'episodes' | 'nextAiringEpisode'> | null;
  }>(EPISODES_QUERY, { id });

  if (!data.Media) throw new AniListRequestError('Anime not found on AniList.', 404);

  // AniList does not expose individual episode titles or dub availability.
  // It does provide the official episode count, which is the stable metadata
  // needed to build a numbered episode picker.
  const count =
    data.Media.episodes ?? Math.max(0, (data.Media.nextAiringEpisode?.episode ?? 1) - 1);

  return Array.from({ length: count }, (_, index) => {
    const number = String(index + 1);
    return { id: number, number, title: `Episode ${number}` };
  });
};
