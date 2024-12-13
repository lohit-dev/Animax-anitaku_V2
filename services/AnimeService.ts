import {
  AnimeData,
  AnimeInfoResponse,
  CategoryResponse,
  SearchParams,
  SearchResponse,
} from '~/types';

const BASE_URL = 'https://aniwatch-mauve.vercel.app/';

// Utility function to fetch data
async function fetchData(endpoint: string): Promise<any> {
  try {
    const response = await fetch(`${BASE_URL}/${endpoint}`);
    if (!response.ok) throw new Error(`Error fetching data from ${endpoint}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

export const fetchHomePage = async (): Promise<AnimeData> => {
  const data = await fetchData('api/v2/hianime/home');
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

  const data = await fetchData(`api/v2/hianime/search?${queryString}`);
  return data;
};

export const fetchCategory = async (category: string): Promise<CategoryResponse> => {
  const data = await fetchData(`api/v2/hianime/category/${category}`);
  return data;
};

export const fetchAnimeById = async (animeId: string): Promise<AnimeInfoResponse> => {
  const data = await fetchData(`api/v2/hianime/anime/${animeId}`);
  console.log(data);
  return data;
};
