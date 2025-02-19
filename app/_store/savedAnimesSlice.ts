import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { Anime } from '~/types';

interface SavedAnimesState {
  animes: Anime[];
}

const initialState: SavedAnimesState = {
  animes: [],
};

const savedAnimesSlice = createSlice({
  name: 'savedAnimes',
  initialState,
  reducers: {
    addAnime: (state, action: PayloadAction<Anime>) => {
      const exists = state.animes.some((anime) => anime.id === action.payload.id);
      if (!exists) {
        state.animes.push(action.payload);
      }
    },
    removeAnime: (state, action: PayloadAction<string>) => {
      state.animes = state.animes.filter((anime) => anime.id !== action.payload);
    },
    clearLibrary: (state) => {
      state.animes = [];
    },
  },
});

export const { addAnime, removeAnime, clearLibrary } = savedAnimesSlice.actions;
export default savedAnimesSlice.reducer;
