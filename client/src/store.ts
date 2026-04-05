import { create } from 'zustand';
import { getParts } from './api';
import _ from 'lodash';

interface AppState {
  parts: any[];
  stats: { total: number; expired: number; warning: number; good: number };
  loading: boolean;
  fetchParts: () => Promise<void>;
}

export const useStore = create<AppState>((set) => ({
  parts: [],
  stats: { total: 0, expired: 0, warning: 0, good: 0 },
  loading: false,
  fetchParts: async () => {
    set({ loading: true });
    try {
      const data = await getParts();
      // Use lodash to sort by expiry date
      const sortedData = _.sortBy(data, 'expiry_date');
      
      const today = new Date();
      let expired = 0, warning = 0, good = 0;
      
      sortedData.forEach((p: any) => {
        const expiryDate = new Date(p.expiry_date);
        const timeDiff = expiryDate.getTime() - today.getTime();
        const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        if (days < 0) expired++;
        else if (days <= 30) warning++;
        else good++;
      });
      
      set({ 
        parts: sortedData, 
        stats: { total: sortedData.length, expired, warning, good },
        loading: false 
      });
    } catch (e) {
      console.error(e);
      set({ loading: false });
    }
  }
}));
