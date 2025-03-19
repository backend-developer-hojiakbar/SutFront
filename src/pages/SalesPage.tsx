import React from 'react';
import { Receipt, Clock, User, ShoppingCart } from 'lucide-react';
import useSalesStore from '../store/salesStore';

export default function SalesPage() {
  const { sales } = useSalesStore();

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Sales Transactions</h1>

      <div className="grid grid-cols-1 gap-6">
        {sales.map((sale) => (
          <div key={sale.id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between border-b pb-4 mb-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Transaction #{sale.id}</h3>
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <Clock className="h-4 w-4 mr-2" />
                    {new Date(sale.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-2" />
                Customer: {sale.customerName || 'Anonymous'}
              </div>

              <div className="flex items-center text-sm text-gray-600">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Items: {sale.items.length}
              </div>

              <div className="flex items-center text-sm text-gray-600">
                <span className="font-medium">Total:</span>
                <span className="ml-1 font-semibold text-blue-600">
                  ${sale.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
