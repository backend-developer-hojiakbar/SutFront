import { create } from 'zustand';

interface SaleItem {
  productId: number;
  quantity: number;
  price: number;
}

export interface Sale {
  id: number;
  timestamp: number;
  customerName?: string;
  items: SaleItem[];
  totalAmount: number;
}

interface SalesStore {
  sales: Sale[];
  addSale: (sale: Omit<Sale, 'id' | 'timestamp'>) => void;
  getSales: () => Sale[];
}

const useSalesStore = create<SalesStore>((set, get) => ({
  sales: [],
  addSale: (sale) => {
    const newSale: Sale = {
      ...sale,
      id: Date.now(),
      timestamp: Date.now()
    };
    set((state) => ({ sales: [...state.sales, newSale] }));
  },
  getSales: () => get().sales
}));

export default useSalesStore;
