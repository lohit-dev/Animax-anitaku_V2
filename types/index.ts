export type AnikotoHomeSpotlightItem = {
  title: string;
  slug: string;
  image: string;
  synopsis?: string;
  quality?: string;
  rating?: string;
  date?: string;
  sub?: boolean;
  dub?: boolean;
};

export type AnikotoHomeListItem = {
  title: string;
  slug: string;
  image: string;
  type?: string;
  episode?: string;
  episodeNumber?: string;
  sub?: boolean;
  dub?: boolean;
  episodeSlug?: string;
};

export type AnikotoHomeResponse = {
  success: boolean;
  data: {
    spotlight: AnikotoHomeSpotlightItem[];
    recentUpdates: AnikotoHomeListItem[];
    upcoming: AnikotoHomeListItem[];
    topTables: {
      newReleases: AnikotoHomeListItem[];
      newlyAdded: AnikotoHomeListItem[];
      justCompleted: AnikotoHomeListItem[];
    };
  };
};

export type AnikotoSearchItem = {
  title: string;
  slug: string;
  image: string;
  type?: string;
  score?: string;
  genres?: string[];
  languages?: string[];
  episode?: string;
};

export type AnikotoSearchResponse = {
  results: AnikotoSearchItem[];
  pagination: {
    currentPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

export type AnikotoDetailsResponse = {
  id: string;
  title: string;
  alternateTitles: string[];
  image: string;
  synopsis: string;
  rating: string;
  quality: string;
  genres: string[];
  status: string;
  released: string;
  duration: string;
  type: string;
  malRating: string;
  aniListId: number | null;
  malId: number | null;
};

export type AnikotoEpisode = {
  id: string;
  episode: string;
  slug: string;
  malId: string;
  timestamp: string;
  sub: boolean;
  dub: boolean;
  serversId: string;
  title: string;
  url: string;
};

export type AnikotoEpisodesResponse = AnikotoEpisode[];

export type SkipTime = {
  start: number;
  end: number;
} | null;

export type Subtitle = {
  file: string;
  label: string;
  kind: string;
  default?: boolean;
};

export type Server = {
  serverName: string;
  type: string;
  svId: string;
  epId: string;
  cmId: string;
  embedUrl: string;
  referer: string;
  m3u8Url: string | null;
  subtitles: Subtitle[];
  error?: string;
};

export type AnikotoStreamResponse = {
  success: boolean;
  data: {
    animeSlug: string;
    episodeNumber: string;
    episodeTitle: string;
    aniListId: number | null;
    malId: number | null;
    intro: SkipTime;
    outro: SkipTime;
    serversId: string;
    totalServers: number;
    servers: Server[];
  };
};

export enum AnimeLanguage {
  SUB = 'sub',
  DUB = 'dub',
}

export enum AnimeType {
  Movie = 'Movie',
  Music = 'Music',
  ONA = 'ONA',
  OVA = 'OVA',
  Special = 'Special',
  TV = 'TV',
  TV_SHORT = 'TV_SHORT',
  TV_Special = 'TV Special',
}

export enum AnimeSeason {
  Fall = 'Fall',
  Summer = 'Summer',
  Spring = 'Spring',
  Winter = 'Winter',
}

export enum AnimeStatus {
  FinishedAiring = 'Finished Airing',
  CurrentlyAiring = 'Currently Airing',
  NotYetAired = 'Not yet aired',
}

export enum AnimeGenre {
  Action = 'Action',
  Adventure = 'Adventure',
  BoysLove = 'Boys Love',
  Cars = 'Cars',
  Comedy = 'Comedy',
  Dementia = 'Dementia',
  Demons = 'Demons',
  Drama = 'Drama',
  Ecchi = 'Ecchi',
  Erotica = 'Erotica',
  Fantasy = 'Fantasy',
  Game = 'Game',
  GirlsLove = 'Girls Love',
  Gourmet = 'Gourmet',
  Harem = 'Harem',
  Historical = 'Historical',
  Horror = 'Horror',
  Isekai = 'Isekai',
  Josei = 'Josei',
  Kids = 'Kids',
  Magic = 'Magic',
  MahouShoujo = 'Mahou Shoujo',
  MartialArts = 'Martial Arts',
  Mecha = 'Mecha',
  Military = 'Military',
  Music = 'Music',
  Mystery = 'Mystery',
  Parody = 'Parody',
  Police = 'Police',
  Psychological = 'Psychological',
  Romance = 'Romance',
  Samurai = 'Samurai',
  School = 'School',
  SciFi = 'Sci-Fi',
  Seinen = 'Seinen',
  Shoujo = 'Shoujo',
  ShoujoAi = 'Shoujo Ai',
  Shounen = 'Shounen',
  ShounenAi = 'Shounen Ai',
  SliceOfLife = 'Slice of Life',
  Space = 'Space',
  Sports = 'Sports',
  SuperPower = 'Super Power',
  Supernatural = 'Supernatural',
  Suspense = 'Suspense',
  Thriller = 'Thriller',
  Unknown = 'unknown',
  Vampire = 'Vampire',
}

export type SearchFilters = {
  genres?: AnimeGenre | string;
  type?: AnimeType | string;
  sort?: string;
  season?: AnimeSeason | string;
  language?: AnimeLanguage | string;
  status?: AnimeStatus | string;
  rated?: string;
  start_date?: string;
  score?: string;
};

export type SearchParams = {
  q: string;
  page?: number;
  filters?: SearchFilters;
};

export type Anime = Partial<AnikotoHomeSpotlightItem> &
  Partial<AnikotoHomeListItem> &
  Partial<AnikotoSearchItem> & {
    title: string;
    slug: string;
    image: string;
    rank?: number;
  };

export type SearchResponse = AnikotoSearchResponse;
export type AnimeInfoResponse = AnikotoDetailsResponse;
export type CharacterVoiceActor = any;
