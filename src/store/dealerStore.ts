import { create } from 'zustand';

export interface Dealer {
  id: number;
  name: string;
  phone: string;
  address: string;
  status: 'active' | 'inactive';
  tradeLicense: string;
  taxInfo: string;
  createdAt: string;
  updatedAt: string;
}



export interface DealerStore {
  dealers: Dealer[];
  addDealer: (dealer: Omit<Dealer, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDealer: (id: number, updatedDealer: Partial<Dealer>) => void;
  deleteDealer: (id: number) => void;
  getDealerById: (id: number) => Dealer | undefined;
}


const useDealerStore = create<DealerStore>((set, get) => ({
  dealers: [
    { 
      id: 1, 
      name: 'Dealer A', 
      phone: '+1234567890', 
      address: '123 Main St', 
      status: 'active',
      tradeLicense: 'ABC123',
      taxInfo: '123456789',
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01'
    },
  ],

  addDealer: (dealer) => set((state) => ({
    dealers: [
      ...state.dealers,
      {
        ...dealer,
        id: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  })),

  updateDealer: (id, updatedDealer) => 
    set((state) => ({
      dealers: state.dealers.map((dealer) =>
        dealer.id === id ? { 
          ...dealer, 
          ...updatedDealer,
          updatedAt: new Date().toISOString()
        } : dealer
      ),
    })),
  deleteDealer: (id) =>
    set((state) => ({ dealers: state.dealers.filter((dealer) => dealer.id !== id) })),
  getDealerById: (id) => get().dealers.find((dealer) => dealer.id === id),
}));


export default useDealerStore;
