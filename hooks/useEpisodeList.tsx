import { useQuery } from '@tanstack/react-query';

import type { Episode } from '~/components/watch/EpisodeList';
import { fetchAnimeEpisode } from '~/services/AnimeService';
import type { AnikotoEpisode } from '~/types';

const mapEpisode = (episode: AnikotoEpisode): Episode => {
  const number = `${Number.parseInt(episode.episode, 10) || 0}`;

  return {
    // The streaming endpoint consumes the episode number, so the player and
    // picker intentionally use it as their shared route identity.
    id: number,
    number,
    title: episode.title || `Episode ${number}`,
    image: undefined,
  };
};

export const useEpisodeList = (animeId: string, type?: 'sub' | 'dub') =>
  useQuery<Episode[]>({
    queryKey: ['anikoto', 'episodes', animeId, type],
    queryFn: async () => {
      const episodes = await fetchAnimeEpisode(animeId);
      return episodes
        .filter((episode) => (type ? Boolean(episode[type]) : episode.sub || episode.dub))
        .map(mapEpisode);
    },
    enabled: !!animeId,
    staleTime: 5 * 60 * 1000,
  });
