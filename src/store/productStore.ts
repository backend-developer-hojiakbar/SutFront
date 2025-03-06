import { create } from 'zustand';

export interface Unit {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  category: string;
}

interface ProductState {
  products: Product[];
  units: Unit[];
  categories: Category[];
  addProduct: (product: Product) => void;
  removeProduct: (id: string) => void;
  updateProduct: (product: Product) => void;
  addUnit: (unit: Unit) => void;
  removeUnit: (id: string) => void;
  addCategory: (category: Category) => void;
  removeCategory: (id: string) => void;
}

const useProductStore = create<ProductState>((set) => ({
  products: [
    {
      id: '1',
      name: 'Sample Product 1',
      price: 100,
      quantity: 10,
      unit: 'pcs',
      category: 'Electronics'
    },
    {
      id: '2',
      name: 'Sample Product 2',
      price: 50,
      quantity: 20,
      unit: 'kg',
      category: 'Groceries'
    }
  ],
  units: [
    { id: '1', name: 'pcs' },
    { id: '2', name: 'kg' }
  ],
  categories: [
    { id: '1', name: 'Electronics' },
    { id: '2', name: 'Groceries' }
  ],
  
  addProduct: (product) => {
    set((state) => ({
      products: [...state.products, product]
    }));
  },
  
  removeProduct: (id) => {
    set((state) => ({
      products: state.products.filter((p) => p.id !== id)
    }));
  },
  
  updateProduct: (product) => {
    set((state) => ({
      products: state.products.map((p) => p.id === product.id ? product : p)
    }));
  },
  
  addUnit: (unit) => {
    set((state) => ({
      units: [...state.units, unit]
    }));
  },
  
  removeUnit: (id) => {
    set((state) => ({
      units: state.units.filter((u) => u.id !== id)
    }));
  },
  
  addCategory: (category) => {
    set((state) => ({
      categories: [...state.categories, category]
    }));
  },
  
  removeCategory: (id) => {
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id)
    }));
  }
}));

export default useProductStore;
