import { create } from 'zustand';

interface CurrencyState {
  currency: 'USD' | 'UZS';
  exchangeRate: number;
  setCurrency: (currency: 'USD' | 'UZS') => void;
  setExchangeRate: (rate: number) => void;
  convertToUSD: (amount: number) => number;
  convertToUZS: (amount: number) => number;
  getDualCurrencyValues: (amount: number) => { usd: string; uzs: string };

  formatCurrency: (amount: number, currency: 'USD' | 'UZS') => string;
}


export const useCurrencyStore = create<CurrencyState>((set, get) => ({
  currency: 'USD',
  exchangeRate: 1,
  setCurrency: (currency) => set({ currency }),
  setExchangeRate: (exchangeRate) => set({ exchangeRate }),
  convertToUSD: (amount) => {
    if (get().currency === 'UZS') {
      return amount / get().exchangeRate;
    }
    return amount;
  },
  convertToUZS: (amount) => {
    if (get().currency === 'USD') {
      return amount * get().exchangeRate;
    }
    return amount;
  },
  getDualCurrencyValues: (amount) => {
    const rate = get().exchangeRate;
    const usdValue = get().currency === 'UZS' ? amount / rate : amount;
    const uzsValue = get().currency === 'USD' ? amount * rate : amount;
    return {
      usd: get().formatCurrency(usdValue, 'USD'),
      uzs: get().formatCurrency(uzsValue, 'UZS')
    };
  },

  formatCurrency: (amount, currency) => {
    const formatter = new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'uz-UZ', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'UZS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return formatter.format(amount);
  },

}));
