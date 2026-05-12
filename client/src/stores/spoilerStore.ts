import { create } from 'zustand';
import { readingStatusApi } from '../api/readingStatus';

type SpoilerFilterMode = 'off' | 'hide_completely' | 'hide_content';

interface SpoilerState {
  mode: SpoilerFilterMode;
  loading: boolean;

  fetchSetting: () => Promise<void>;
  updateSetting: (mode: SpoilerFilterMode) => Promise<void>;
}

export const useSpoilerStore = create<SpoilerState>((set) => ({
  mode: 'off',
  loading: false,

  fetchSetting: async () => {
    set({ loading: true });
    try {
      const res = await readingStatusApi.getSpoilerSetting();
      set({ mode: res.data.mode, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  updateSetting: async (mode: SpoilerFilterMode) => {
    set({ loading: true });
    try {
      await readingStatusApi.updateSpoilerSetting({ mode });
      set({ mode, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
