import { useQuery } from '@tanstack/react-query';

import type { Episode } from '~/components/watch/EpisodeList';
import { fetchAniListEpisodes } from '~/services/AniListService';
import type { AniListEpisode } from '~/types';

const mapEpisode = (episode: AniListEpisode): Episode => ({
  id: episode.id,
  number: episode.number,
  title: episode.title,
  image: undefined,
});

export const useEpisodeList = (animeId: string) =>
  useQuery<Episode[]>({
    queryKey: ['anilist', 'episodes', animeId],
    queryFn: async () => {
      const episodes = await fetchAniListEpisodes(animeId);
      return episodes.map(mapEpisode);
    },
    enabled: !!animeId,
    staleTime: 5 * 60 * 1000,
  });
