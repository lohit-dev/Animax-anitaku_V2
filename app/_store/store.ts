import { configureStore } from '@reduxjs/toolkit';

import savedAnimesReducer from './savedAnimesSlice';

export const store = configureStore({
  reducer: {
    savedAnimes: savedAnimesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
