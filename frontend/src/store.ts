import { create } from 'zustand';

interface Filters {
  tahun: string[];
  bulan: string[];
  outlet: string[];
  produk: string[];
  kategori: string[];
  metode_pembayaran: string[];
}

interface AppState {
  filters: Filters;
  setFilter: (key: keyof Filters, value: string[]) => void;
  toggleFilterValue: (key: keyof Filters, value: string) => void;
  clearFilters: () => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  filters: {
    tahun: [],
    bulan: [],
    outlet: [],
    produk: [],
    kategori: [],
    metode_pembayaran: [],
  },
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),
  toggleFilterValue: (key, value) => 
    set((state) => {
      const current = state.filters[key];
      const isSelected = current.includes(value);
      const next = isSelected ? current.filter(v => v !== value) : [...current, value];
      return { filters: { ...state.filters, [key]: next } };
    }),
  clearFilters: () =>
    set(() => ({
      filters: {
        tahun: [],
        bulan: [],
        outlet: [],
        produk: [],
        kategori: [],
        metode_pembayaran: [],
      },
    })),
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));
