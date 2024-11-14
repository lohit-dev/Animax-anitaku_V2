interface Episode {
  id: string;
  number: number | string;
  url: string;
}

export interface Anime {
  id: string;
  title: string;
  url: string;
  genres: string[];
  totalEpisodes: number;
  image: string;
  releaseDate: string;
  description: string;
  subOrDub: 'sub' | 'dub';
  type: string;
  status: 'Completed' | 'Ongoing';
  otherName: string;
  episodes: Episode[];
}
