/**
 * EduLite Mobile AI - Redux Store Configuration
 */

import { configureStore } from '@reduxjs/toolkit';
import aiReducer from './slices/aiSlice';

export const store = configureStore({
    reducer: {
        ai: aiReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore non-serializable values in AI state
                ignoredActions: ['ai/setModelContext'],
                ignoredPaths: ['ai.modelContexts'],
            },
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
