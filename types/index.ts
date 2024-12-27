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

type Season = {
  id: string;
  name: string;
  title: string;
  poster: string;
  isCurrent: boolean;
};

export type AnimeInfoResponse = {
  success: boolean;
  data: {
    anime: {
      info: {
        id: string;
        anilistId: BigInt;
        malId: BigInt;
        name: string;
        poster: string;
        description: string;
        stats: {
          rating: string;
          quality: string;
          episodes: {
            sub: number;
            dub: number;
          };
          type: string;
          duration: string;
        };
        promotionalVideos: PromotionalVideo[];
        charactersVoiceActors: CharacterVoiceActor[];
      };
      moreInfo: {
        japanese: string;
        synonyms: string;
        premiered: string;
        malscore: string;
        aired: string;
        genres: string[];
        status: string;
        studios: string;
        duration: string;
        producers: string[];
      };
      seasons: Season[];
      mostPopularAnimes: Anime[];
      recommended: Anime[];
      related: Anime[];
    };
  };
};

export type PromotionalVideo = {
  title: string | undefined;
  source: string | undefined;
  thumbnail: string | undefined;
};

export type CharacterVoiceActor = {
  character: {
    id: string;
    poster: string;
    name: string;
    cast: string;
  };
  voiceActor: {
    id: string;
    poster: string;
    name: string;
    cast: string;
  };
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

export type Genre =
  | 'Action'
  | 'Adventure'
  | 'Cars'
  | 'Comedy'
  | 'Dementia'
  | 'Demons'
  | 'Drama'
  | 'Ecchi'
  | 'Fantasy'
  | 'Game'
  | 'Harem'
  | 'Historical'
  | 'Horror'
  | 'Isekai'
  | 'Josei'
  | 'Kids'
  | 'Magic'
  | 'Martial Arts'
  | 'Mecha'
  | 'Military'
  | 'Music'
  | 'Mystery'
  | 'Parody'
  | 'Police'
  | 'Psychological'
  | 'Romance'
  | 'Samurai'
  | 'School'
  | 'Sci-Fi'
  | 'Seinen'
  | 'Shoujo'
  | 'Shoujo Ai'
  | 'Shounen'
  | 'Shounen Ai'
  | 'Slice of Life'
  | 'Space'
  | 'Sports'
  | 'Super Power'
  | 'Supernatural'
  | 'Thriller'
  | 'Vampire';

export type CategoryResponse = {
  success: boolean;
  data: {
    animes: Anime[];
    genres: Genre;
    top10Animes: Top10Animes;
  };
};

export type Character = {
  id: string;
  poster: string;
  name: string;
  cast: string;
};
