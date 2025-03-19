import React, { useState } from 'react';
import { ShoppingCart, Package } from 'lucide-react';
import { useCurrencyStore } from '../store/currencyStore';
import { useDealerStore } from '../store/dealerStore';
import { useProductStore } from '../store/productStore';
import { useClientStore } from '../store/clientStore';
import POSCheck from '../components/POSCheck'; // POSCheck komponentini import qilamiz

interface Invoice {
  id: number;
  dealerId: number;
  clientId: number;
  productId: number;
  quantity: number;
  totalPrice: number;
  date: string;
  status: 'pending' | 'completed';
}

interface Product {
  id: number;
  name: string;
  stock: number;
  price: number;
}

interface Dealer {
  id: number;
  name: string;
}

interface Client {
  id: number;
  name: string;
}

export default function SellPage() {
  const { formatCurrency } = useCurrencyStore();
  const { dealers } = useDealerStore();
  const { products, updateProductStock } = useProductStore();
  const { clients } = useClientStore();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [selectedDealer, setSelectedDealer] = useState<number | null>(null);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [newClientName, setNewClientName] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [showCheck, setShowCheck] = useState(false); // POSCheck ko'rsatish uchun state
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null); // joriy invoice

  const handleAddClient = () => {
    if (newClientName.trim() !== '') {
      const newClient = {
        id: Date.now(), // vaqtga asoslangan ID
        name: newClientName,
      };
      useClientStore.getState().addClient(newClient); // clientStore ga qo'shamiz
      setNewClientName(''); // inputni tozalaymiz
    }
  };

  const handleSell = async () => {
    setError(null);

    if (
      !selectedProduct ||
      !selectedDealer ||
      (!selectedClient && !newClientName) ||
      quantity <= 0
    ) {
      setError('Please fill all required fields');
      return;
    }

    const product = products.find((p: Product) => p.id === selectedProduct);
    if (!product) {
      setError('Product not found');
      return;
    }

    if (product.stock < quantity) {
      setError('Not enough stock available');
      return;
    }

    try {
      const newInvoice: Invoice = {
        id: invoices.length + 1,
        dealerId: selectedDealer,
        clientId: selectedClient || -1,
        productId: selectedProduct,
        quantity: quantity,
        totalPrice: product.price * quantity,
        date: new Date().toISOString(),
        status: 'pending',
      };

      await updateProductStock(selectedProduct, -quantity);
      setInvoices([...invoices, newInvoice]);
      setCurrentInvoice(newInvoice); // joriy invoice ni saqlaymiz
      setShowCheck(true); // chekni ko'rsatamiz
      resetForm();
    } catch (err) {
      setError('Failed to process sale. Please try again.');
      console.error('Sale error:', err);
    }
  };

  const resetForm = () => {
    setSelectedProduct(null);
    setSelectedDealer(null);
    setSelectedClient(null);
    setNewClientName('');
    setQuantity(1);
    setError(null);
  };

  const getProductName = (productId: number): string => {
    const product = products.find((p: Product) => p.id === productId);
    return product?.name || 'Unknown Product';
  };

  const getDealerName = (dealerId: number): string => {
    const dealer = dealers.find((d: Dealer) => d.id === dealerId);
    return dealer?.name || 'Unknown Dealer';
  };

  const getClientName = (clientId: number): string => {
    const client = clients.find((c: Client) => c.id === clientId);
    return client?.name || 'Unknown Client';
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center">
        <ShoppingCart className="mr-2" />
        Sell Products
      </h1>

      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <h2 className="text-lg font-medium mb-4">New Sale</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={selectedProduct || ''}
              onChange={(e) => setSelectedProduct(Number(e.target.value))}
            >
              <option value="">Select product</option>
              {products.map((product: Product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.stock} available)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dealer
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={selectedDealer || ''}
              onChange={(e) => setSelectedDealer(Number(e.target.value))}
            >
              <option value="">Select dealer</option>
              {dealers.map((dealer: Dealer) => (
                <option key={dealer.id} value={dealer.id}>
                  {dealer.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={selectedClient || ''}
              onChange={(e) => setSelectedClient(Number(e.target.value))}
            >
              <option value="">Select client</option>
              {clients.map((client: Client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <input
              type="number"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={quantity}
              min={1}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Client
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Enter new client name"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
              />
              <button
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                onClick={handleAddClient}
              >
                Add Client
              </button>
            </div>
          </div>

          {error && (
            <div className="col-span-full text-red-500 text-sm">{error}</div>
          )}

          <div className="flex items-end">
            <button
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              onClick={handleSell}
              disabled={
                !selectedProduct ||
                !selectedDealer ||
                (!selectedClient && !newClientName) ||
                quantity <= 0
              }
            >
              Process Sale
            </button>
          </div>
        </div>
      </div>

      {/* POS Check */}
      {showCheck && currentInvoice && (
        <POSCheck
          invoice={currentInvoice}
          product={products.find((p) => p.id === currentInvoice.productId)}
          dealer={dealers.find((d) => d.id === currentInvoice.dealerId)}
          client={clients.find((c) => c.id === currentInvoice.clientId)}
        />
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-medium mb-4 flex items-center">
          <Package className="mr-2" />
          Sales History
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dealer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice: Invoice) => {
                const product = products.find(
                  (p: Product) => p.id === invoice.productId
                );
                return (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getDealerName(invoice.dealerId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getClientName(invoice.clientId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(invoice.totalPrice, 'USD')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}