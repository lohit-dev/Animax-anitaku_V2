import { AnimeData, SearchParams, SearchResponse } from '~/types';

export const fetchHomePage = async (): Promise<AnimeData> => {
  const response = await fetch('https://aniwatch-api.onrender.com/api/v2/hianime/home');
  if (!response.ok) throw new Error('Error fetching anime home page data');
  const data = await response.json();

  return data?.data;
};
export const fetchSearchDetails = async (params: SearchParams): Promise<SearchResponse> => {
  const { q, filters, page = 1 } = params;

  let queryString = `q=${encodeURIComponent(q)}&page=${page}`;

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        queryString += `&${key}=${encodeURIComponent(value)}`;
      }
    });
  }

  const response = await fetch(
    `https://aniwatch-api.onrender.com/api/v2/hianime/search?${queryString}`
  );

  if (!response.ok) throw new Error('Error fetching search details');
  const data = await response.json();

  console.log(data);
  return data;
};
