import React, { useState, useEffect } from 'react';
import { Store, Plus, Search, Phone, MapPin, Eye } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

interface Shop {
  id: number;
  username: string;
  email: string;
  address: string | null;
  phone_number: string | null;
  balance: string;
  is_active: boolean;
  last_sotuv_vaqti: string | null;
  created_by?: number;
}

interface Payment {
  id: number;
  shopId: number;
  amount: string;
  date: string;
  typeSotuv: 'naqd' | 'karta' | 'shot';
}

interface Sale {
  id: number;
  sana: string;
  sotib_oluvchi: number;
  total_sum: string;
  ombor: number;
  items: { mahsulot: number; soni: number; narx: string }[];
}

interface Product {
  id: number;
  name: string;
  rasm: string | null;
}

const BASE_URL = 'https://lemoonapi.cdpos.uz:444/';

export default function ShopsPage() {
  const { token, user } = useAuthStore();
  const [shops, setShops] = useState<Shop[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showSales, setShowSales] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'naqd' | 'karta' | 'shot'>('naqd');
  const [currentShopId, setCurrentShopId] = useState<number | null>(null);
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [newShop, setNewShop] = useState({
    username: '',
    email: '',
    password: '',
    address: '',
    phone_number: '',
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiConfig = {
    headers: { Authorization: `JWT ${token}` },
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!token || !user) {
        setError('Autentifikatsiya tokeni yoki foydalanuvchi topilmadi.');
        setLoading(false);
        return;
      }

      try {
        // Do‘konlarni olish
        const shopsRes = await axios.get(`${BASE_URL}users/?user_type=shop`, apiConfig);
        console.log("Shops Response:", JSON.stringify(shopsRes.data, null, 2));
        let shopsData = Array.isArray(shopsRes.data.results) ? shopsRes.data.results : shopsRes.data;

        // `user_type='shop'` bo'lganlarni filtrlaymiz
        shopsData = shopsData.filter((shop: any) => shop.user_type === 'shop');

        // Filtrlash logikasi
        if (user.role === 'admin' || user.role === 'omborchi') {
          // Admin yoki omborchi bo'lsa hamma shop'larni qoldiramiz
          shopsData = shopsData;
        } else if (user.role === 'dealer') {
          // Dealer bo'lsa faqat o'zi yaratgan shop'larni filtrlaymiz
          shopsData = shopsData.filter((shop: any) => shop.created_by === user.id);
        }

        // Sotuvlarni olish
        const salesRes = await axios.get(`${BASE_URL}sotuvlar/`, apiConfig);
        console.log("Sales Response:", JSON.stringify(salesRes.data, null, 2));
        const salesData = Array.isArray(salesRes.data) ? salesRes.data : salesRes.data.results || [];
        setSales(salesData);

        // Har bir shop uchun oxirgi sotuv sanasini yangilash
        const updatedShops = shopsData.map((shop: Shop) => {
          const lastSale = salesData
            .filter((sale: Sale) => sale.sotib_oluvchi === shop.id)
            .sort((a: Sale, b: Sale) => new Date(b.sana).getTime() - new Date(a.sana).getTime())[0];
          return {
            ...shop,
            last_sotuv_vaqti: lastSale ? lastSale.sana : shop.last_sotuv_vaqti || null,
          };
        });
        setShops(updatedShops);

        // To‘lovlarni olish
        const paymentsRes = await axios.get(`${BASE_URL}payments/`, apiConfig);
        console.log("Payments Response:", JSON.stringify(paymentsRes.data, null, 2));
        const paymentsData = Array.isArray(paymentsRes.data.results) ? paymentsRes.data.results : paymentsRes.data;
        setPayments(
          paymentsData
            .filter((p: any) => updatedShops.some((s: Shop) => s.id === p.user))
            .map((p: any) => ({
              id: p.id,
              shopId: p.user,
              amount: p.summa,
              date: p.sana,
              typeSotuv: p.typeSotuv,
            }))
        );

        // Mahsulotlarni olish
        const productsRes = await axios.get(`${BASE_URL}mahsulotlar/`, apiConfig);
        console.log("Products Response:", JSON.stringify(productsRes.data, null, 2));
        const productsData = Array.isArray(productsRes.data.results) ? productsRes.data.results : productsRes.data;
        setProducts(productsData);

      } catch (err: any) {
        console.error('Error fetching data:', err.response?.data || err.message);
        setError(err.response?.data?.detail || 'Ma\'lumotlarni yuklashda xatolik yuz berdi');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, user]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setIsEditMode(false);
    setNewShop({ username: '', email: '', password: '', address: '', phone_number: '' });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNewShop({ username: '', email: '', password: '', address: '', phone_number: '' });
    setIsEditMode(false);
    setCurrentShopId(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewShop(prev => ({ ...prev, [name]: value }));
  };

  const handleAddShop = async () => {
    if (!newShop.username || !newShop.password) {
      setError('Do‘kon nomi va parol kiritilishi shart.');
      return;
    }

    setIsSubmitting(true);
    try {
      const shopData = {
        username: newShop.username,
        email: newShop.email,
        password: newShop.password,
        address: newShop.address || null,
        phone_number: newShop.phone_number || null,
        user_type: 'shop',
        created_by: user?.id,
      };

      if (isEditMode && currentShopId) {
        const updateData = { ...shopData };
        if (!newShop.password) delete updateData.password;
        const response = await axios.put(`${BASE_URL}users/${currentShopId}/`, updateData, apiConfig);
        setShops(shops.map(s => (s.id === currentShopId ? response.data : s)));
      } else {
        const response = await axios.post(`${BASE_URL}users/`, shopData, apiConfig);
        setShops([...shops, response.data]);
      }

      handleCloseModal();
      setError(null);
    } catch (err: any) {
      console.error('Error adding/updating shop:', err.response?.data || err.message);
      const errorMsg = err.response?.data?.detail || 
                       err.response?.data?.error || 
                       'Do‘kon qo‘shishda/yangilashda xatolik yuz berdi';
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditShop = (shop: Shop) => {
    setNewShop({
      username: shop.username,
      email: shop.email,
      password: '',
      address: shop.address || '',
      phone_number: shop.phone_number || '',
    });
    setIsEditMode(true);
    setCurrentShopId(shop.id);
    setIsModalOpen(true);
  };

  const handleDeleteShop = async (id: number) => {
    if (window.confirm('Ushbu do‘konni o‘chirishni xohlaysizmi?')) {
      try {
        await axios.delete(`${BASE_URL}users/${id}/`, apiConfig);
        setShops(shops.filter(s => s.id !== id));
        setError(null);
      } catch (err: any) {
        console.error('Error deleting shop:', err.response?.data || err.message);
        setError(err.response?.data?.detail || 'Do‘kon o‘chirishda xatolik yuz berdi');
      }
    }
  };

  const handlePayment = async () => {
    if (!currentShopId || !paymentAmount || isSubmitting) {
      setError('Summa kiritilishi shart yoki so‘rov allaqachon yuborilmoqda');
      return;
    }

    setIsSubmitting(true);
    try {
      const paymentData = {
        user: currentShopId,
        sana: new Date().toISOString().split('T')[0],
        summa: parseFloat(paymentAmount).toFixed(2),
        typeSotuv: paymentType,
      };

      console.log("Sending payment request:", JSON.stringify(paymentData, null, 2));
      const response = await axios.post(`${BASE_URL}payments/`, paymentData, apiConfig);
      console.log("Payment response:", JSON.stringify(response.data, null, 2));
      setPayments([...payments, {
        id: response.data.id,
        shopId: currentShopId,
        amount: response.data.summa,
        date: response.data.sana,
        typeSotuv: response.data.typeSotuv,
      }]);
      const updatedShopRes = await axios.get(`${BASE_URL}users/${currentShopId}/`, apiConfig);
      console.log("Updated shop after payment:", JSON.stringify(updatedShopRes.data, null, 2));
      setShops(shops.map(s => 
        s.id === currentShopId ? updatedShopRes.data : s
      ));
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentType('naqd');
      setCurrentShopId(null);
      setError(null);
    } catch (err: any) {
      console.error('Error adding payment:', err.response?.data || err.message);
      setError(err.response?.data?.detail || 'To‘lov qo‘shishda xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewSales = (shopId: number) => {
    setSelectedShopId(shopId);
    setShowSales(true);
    setIsSalesModalOpen(true);
  };

  const handleViewProducts = (sale: Sale) => {
    setSelectedSale(sale);
    setIsProductsModalOpen(true);
  };

  const calculateTotalSales = (shopId: number) => {
    return sales
      .filter(sale => sale.sotib_oluvchi === shopId)
      .reduce((sum, sale) => sum + parseFloat(sale.total_sum), 0);
  };

  const calculateTotalPayments = (shopId: number) => {
    return payments
      .filter(payment => payment.shopId === shopId)
      .reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : `Mahsulot #${productId}`;
  };

  const getProductImage = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product && product.rasm ? `${BASE_URL}${product.rasm}` : null;
  };

  const filteredShops = shops.filter(shop =>
    shop.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (shop.email && shop.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (shop.address && shop.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (shop.phone_number && shop.phone_number.includes(searchTerm))
  );

  if (loading) return <div className="p-6">Yuklanmoqda...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Do‘konlarni qidirish..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {(user?.role === 'admin' || user?.role === 'dealer') && (
          <button
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            onClick={handleOpenModal}
          >
            <Plus className="h-5 w-5 mr-2" />
            Do‘kon qo‘shish
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredShops.map((shop) => (
          <div key={shop.id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Store className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">{shop.username}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    shop.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {shop.is_active ? 'Aktiv' : 'Faol emas'}
                  </span>
                </div>
              </div>
              {(user?.role === 'admin' || user?.role === 'dealer') && (
                <div className="flex gap-2">
                  <button
                    className="text-gray-400 hover:text-gray-500"
                    onClick={() => handleEditShop(shop)}
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 012.828 0l3.793 3.793a2 2 0 010 2.828l-9.5 9.5a2 2 0 01-1.061.586h-3a2 2 0 01-2-2v-3a2 2 0 01.586-1.061l9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteShop(shop.id)}
                    className="text-red-400 hover:text-red-500"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center text-sm text-gray-500">
                <MapPin className="h-4 w-4 mr-2" />
                {shop.address || 'Manzil kiritilmagan'}
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Phone className="h-4 w-4 mr-2" />
                {shop.phone_number || 'Telefon kiritilmagan'}
              </div>
              <div className="mt-2">
                <h4 className="text-sm font-medium text-gray-700">Email</h4>
                <p className="text-sm text-gray-500">{shop.email || 'Email kiritilmagan'}</p>
              </div>
              <div className="mt-2">
                <h4 className="text-sm font-medium text-gray-700">Balans</h4>
                <p className="text-sm text-gray-500">UZS: {shop.balance}</p>
              </div>
              {(user?.role === 'admin' || user?.role === 'dealer') && (
                <button
                  className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  onClick={() => {
                    setCurrentShopId(shop.id);
                    setIsPaymentModalOpen(true);
                  }}
                >
                  To‘lov qilish
                </button>
              )}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  Oxirgi sotuv: {shop.last_sotuv_vaqti || 'Mavjud emas'}
                </span>
                <button
                  onClick={() => handleViewSales(shop.id)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Sotuvlar tarixi
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (user?.role === 'admin' || user?.role === 'dealer') && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-medium mb-4">{isEditMode ? 'Do‘konni tahrirlash' : 'Yangi do‘kon qo‘shish'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Do‘kon nomi *</label>
                <input
                  type="text"
                  name="username"
                  value={newShop.username}
                  onChange={handleInputChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Do‘kon nomini kiriting"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={newShop.email}
                  onChange={handleInputChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Email kiriting"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Parol {isEditMode ? '' : '*'}</label>
                <input
                  type="password"
                  name="password"
                  value={newShop.password}
                  onChange={handleInputChange}
                  placeholder={isEditMode ? 'Agar o‘zgartirmoqchi bo‘lsangiz kiriting' : 'Parol kiriting'}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required={!isEditMode}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Manzil</label>
                <input
                  type="text"
                  name="address"
                  value={newShop.address}
                  onChange={handleInputChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Manzil kiriting"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Telefon</label>
                <input
                  type="text"
                  name="phone_number"
                  value={newShop.phone_number}
                  onChange={handleInputChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Telefon kiriting"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            {error && <div className="mt-4 text-red-600 text-sm">{error}</div>}
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                disabled={isSubmitting}
              >
                Bekor qilish
              </button>
              <button
                onClick={handleAddShop}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isSubmitting}
              >
                {isEditMode ? 'Yangilash' : 'Qo‘shish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isPaymentModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-medium mb-4">To‘lov qilish</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">To‘lov summasi</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">To‘lov turi</label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as 'naqd' | 'karta' | 'shot')}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  disabled={isSubmitting}
                >
                  <option value="naqd">Naqd</option>
                  <option value="karta">Karta</option>
                  <option value="shot">Shot</option>
                </select>
              </div>
            </div>
            {error && <div className="mt-4 text-red-600 text-sm">{error}</div>}
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setPaymentAmount('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                disabled={isSubmitting}
              >
                Bekor qilish
              </button>
              <button
                onClick={handlePayment}
                disabled={isSubmitting}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                To‘lovni tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {isSalesModalOpen && selectedShopId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-4">
                <button
                  onClick={() => setShowSales(true)}
                  className={`text-lg font-medium ${showSales ? 'text-blue-600 underline' : 'text-gray-700'}`}
                >
                  Sotuvlar
                </button>
                <button
                  onClick={() => setShowSales(false)}
                  className={`text-lg font-medium ${!showSales ? 'text-blue-600 underline' : 'text-gray-700'}`}
                >
                  To‘lovlar
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              {showSales ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sana
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jami summa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mahsulotlar
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sales
                      .filter(sale => sale.sotib_oluvchi === selectedShopId)
                      .map((sale) => (
                        <tr key={sale.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {sale.sana}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {parseFloat(sale.total_sum).toLocaleString()} UZS
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <button
                              onClick={() => handleViewProducts(sale)}
                              className="text-blue-600 hover:text-blue-800 flex items-center"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Mahsulotlarni ko‘rish
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sana
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Summa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        To‘lov turi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments
                      .filter(payment => payment.shopId === selectedShopId)
                      .map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment.date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {parseFloat(payment.amount).toLocaleString()} UZS
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment.typeSotuv}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="mt-4 text-lg font-medium text-gray-900">
              Umumiy narx: {showSales 
                ? calculateTotalSales(selectedShopId).toLocaleString() 
                : calculateTotalPayments(selectedShopId).toLocaleString()} UZS
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsSalesModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {isProductsModalOpen && selectedSale && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl">
            <h2 className="text-lg font-medium mb-4">Sotuvdagi mahsulotlar</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rasm
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mahsulot nomi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Soni
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Narx
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedSale.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getProductImage(item.mahsulot) ? (
                          <img
                            src={getProductImage(item.mahsulot)!}
                            alt={getProductName(item.mahsulot)}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          'Rasm yo‘q'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getProductName(item.mahsulot)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.soni}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {parseFloat(item.narx).toLocaleString()} UZS
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsProductsModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}