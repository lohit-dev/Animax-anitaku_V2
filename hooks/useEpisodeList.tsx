import { useQuery } from '@tanstack/react-query';

import type { Episode } from '~/components/watch/EpisodeList';
import { fetchAnimeEpisode } from '~/services/AnimeService';
import type { AnikotoEpisode } from '~/types';

const mapEpisode = (episode: AnikotoEpisode): Episode => ({
  id: episode.slug || episode.id,
  number: `${Number.parseInt(episode.episode, 10) || 0}`,
  title: episode.title || `Episode ${episode.episode}`,
  image: undefined,
});

export const useEpisodeList = (animeId: string) =>
  useQuery<Episode[]>({
    queryKey: ['episodes', animeId],
    queryFn: async () => {
      const episodes = await fetchAnimeEpisode(animeId);
      return episodes.map(mapEpisode);
    },
    enabled: !!animeId,
    staleTime: 5 * 60 * 1000,
  });
