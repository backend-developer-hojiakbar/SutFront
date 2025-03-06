import { create } from 'zustand';

export interface Shop {
  id: number;
  name: string;
  address: string;
  phone: string;
  dealer: string;
  status: 'active' | 'inactive';
  lastPurchaseDate: string;
  debt: number;
}

interface ShopStore {
  shops: Shop[];
  addShop: (shop: Shop) => void;
  updateShop: (id: number, updatedShop: Partial<Shop>) => void;
  deleteShop: (id: number) => void;
  getShopById: (id: number) => Shop | undefined;
}

const useShopStore = create<ShopStore>((set, get) => ({
  shops: [
    {
      id: 1,
      name: 'Shop A',
      address: '123 Market St',
      phone: '+1234567890',
      dealer: 'Dealer A',
      status: 'active',
      lastPurchaseDate: '2023-10-01',
      debt: 0
    },
    {
      id: 2,
      name: 'Shop B',
      address: '456 Commerce St',
      phone: '+1234567891',
      dealer: 'Dealer B',
      status: 'active',
      lastPurchaseDate: '2023-10-15',
      debt: 0
    }
  ],
  addShop: (shop) => set((state) => ({ shops: [...state.shops, shop] })),
  updateShop: (id, updatedShop) => 
    set((state) => ({
      shops: state.shops.map((shop) =>
        shop.id === id ? { ...shop, ...updatedShop } : shop
      ),
    })),
  deleteShop: (id) =>
    set((state) => ({ shops: state.shops.filter((shop) => shop.id !== id) })),
  getShopById: (id) => get().shops.find((shop) => shop.id === id),
}));

export default useShopStore;
