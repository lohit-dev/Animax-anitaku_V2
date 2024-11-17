import { AnimeData } from '~/types';

export const fetchHomePage = async (): Promise<AnimeData> => {
  const response = await fetch('https://aniwatch-api.onrender.com/api/v2/hianime/home');
  if (!response.ok) throw new Error('Error fetching anime home page data');
  const data = await response.json();

  return data?.data;
};
