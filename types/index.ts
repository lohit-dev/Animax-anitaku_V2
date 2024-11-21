export type Anime = {
  id: string;
  name: string;
  poster: string;
  type?: string;
  episodes?: {
    sub?: number | null;
    dub?: number | null;
  };
  rank?: number;
  jname: string;
  description?: string;
  otherInfo?: string[];
  duration?: string;
  rating?: string | null;
};

type TrendingAnime = {
  rank: number;
  id: string;
  name: string;
  jname: string;
  poster: string;
};

export type Top10Animes = {
  today: Anime[];
  week: Anime[];
  month: Anime[];
};

export type AnimeData = {
  spotlightAnimes: Anime[];
  trendingAnimes: TrendingAnime[];
  latestEpisodeAnimes: Anime[];
  top10Animes: Top10Animes;
  topAiringAnimes: (Anime & {
    jname: string;
  })[];
  topUpcomingAnimes: (Anime & {
    duration: string;
    rating: string | null;
  })[];
  mostPopularAnimes: Anime[];
  mostFavoriteAnimes: Anime[];
  latestCompletedAnimes: Anime[];
  genres: string[];
};

type SearchFilters = {
  genres?: string;
  type?: string;
  sort?: string;
  season?: string;
  language?: string;
  status?: string;
  rated?: string;
  start_date?: string;
  score?: string;
};

export type SearchParams = {
  q: string;
  page?: number;
  filters?: SearchFilters;
};

export type SearchResponse = {
  success: boolean;
  data: {
    animes: Anime[];
    searchQuery: string;
    searchFilters: SearchFilters;
    totalPages: number;
    hasNextPage: boolean;
    currentPage: number;
  };
};
export type ApiResponse = {
  success: boolean;
  data: AnimeData;
};
