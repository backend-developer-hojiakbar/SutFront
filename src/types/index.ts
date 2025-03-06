export interface CurrencyConversion {
  amount: number;
  fromCurrency: 'USD' | 'UZS';
  toCurrency: 'USD' | 'UZS';
  convertedAmount: number;
}

export interface CurrencyState {
  currency: 'USD' | 'UZS';
  exchangeRate: number;
}

export interface CurrencySelectorProps {
  onChange: (currency: 'USD' | 'UZS') => void;
  currentCurrency: 'USD' | 'UZS';
}
