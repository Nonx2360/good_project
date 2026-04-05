import { create } from 'zustand';
import { getParts } from './api';
import _ from 'lodash';

interface AppState {
  parts: any[];
  stats: { total: number; inStock: number; active: number; expired: number; warning: number; good: number };
  loading: boolean;
  fetchParts: () => Promise<void>;
}

export const useStore = create<AppState>((set) => ({
  parts: [],
  stats: { total: 0, inStock: 0, active: 0, expired: 0, warning: 0, good: 0 },
  loading: false,
  fetchParts: async () => {
    set({ loading: true });
    try {
      const data = await getParts();
      const sortedData = _.sortBy(data, [(p: any) => p.status === 'active' ? 0 : p.status === 'in_stock' ? 1 : 2, 'expiry_date']);
      
      const today = new Date();
      let inStock = 0, active = 0, expired = 0, warning = 0, good = 0;
      
      sortedData.forEach((p: any) => {
        if (p.status === 'in_stock' || !p.status) {
          inStock++;
        } else if (p.status === 'active' && p.expiry_date) {
          const expiryDate = new Date(p.expiry_date);
          const timeDiff = expiryDate.getTime() - today.getTime();
          const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
          
          active++;
          if (days < 0) expired++;
          else if (days <= 30) warning++;
          else good++;
        }
      });
      
      set({ 
        parts: sortedData, 
        stats: { total: sortedData.length, inStock, active, expired, warning, good },
        loading: false 
      });
    } catch (e) {
      console.error(e);
      set({ loading: false });
    }
  }
}));
