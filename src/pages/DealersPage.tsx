import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Phone, MapPin, Eye, Activity } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

interface Dealer {
  id: number;
  username: string;
  email: string;
  address: string | null;
  phone_number: string | null;
  balance: string;
  is_active: boolean;
}

interface Payment {
  id: number;
  dealerId: number;
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
  time: string;
  items: { mahsulot: number; soni: number; narx: string }[];
}

interface Product {
  id: number;
  name: string;
  rasm: string | null;
}

interface ActivityLog {
  id: number;
  type: 'sale' | 'payment';
  description: string;
  timestamp: string;
}

const BASE_URL = 'https://lemoonapi.cdpos.uz:444/';

export default function DealersPage() {
  const { token, user } = useAuthStore();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [isActivitiesModalOpen, setIsActivitiesModalOpen] = useState(false);
  const [selectedDealerId, setSelectedDealerId] = useState<number | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showSales, setShowSales] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'naqd' | 'karta' | 'shot'>('naqd');
  const [currentDealerId, setCurrentDealerId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDealer, setNewDealer] = useState({
    username: '',
    password: '',
    address: '',
    phone_number: '',
    balance: '',
  });
  const [editingDealerId, setEditingDealerId] = useState<number | null>(null);
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
        const dealersRes = await axios.get(`${BASE_URL}users/?user_type=dealer`, apiConfig);
        const usersData = Array.isArray(dealersRes.data.results) ? dealersRes.data.results : dealersRes.data;
        const filteredDealers = usersData.filter((user: any) => user.user_type === 'dealer');
        setDealers(filteredDealers);

        const paymentsRes = await axios.get(`${BASE_URL}payments/`, apiConfig);
        const paymentsData = Array.isArray(paymentsRes.data.results) ? paymentsRes.data.results : paymentsRes.data;
        setPayments(
          paymentsData
            .filter((p: any) => filteredDealers.some((d: Dealer) => d.id === p.user))
            .map((p: any) => ({
              id: p.id,
              dealerId: p.user,
              amount: p.summa,
              date: p.sana,
              typeSotuv: p.typeSotuv,
            }))
        );

        const salesRes = await axios.get(`${BASE_URL}sotuvlar/`, apiConfig);
        const salesData = Array.isArray(salesRes.data) ? salesRes.data : salesRes.data.results || [];
        setSales(salesData.sort((a: Sale, b: Sale) => new Date(b.time).getTime() - new Date(a.time).getTime()));

        const productsRes = await axios.get(`${BASE_URL}mahsulotlar/`, apiConfig);
        const productsData = Array.isArray(productsRes.data.results) ? productsRes.data.results : productsRes.data;
        setProducts(productsData);

        const saleActivities = salesData.map((sale: Sale) => ({
          id: sale.id,
          type: 'sale' as const,
          description: `Sotuv: ${parseFloat(sale.total_sum).toLocaleString()} UZS`,
          timestamp: sale.time,
        }));
        const paymentActivities = paymentsData.map((payment: any) => ({
          id: payment.id,
          type: 'payment' as const,
          description: `To‘lov: ${parseFloat(payment.summa).toLocaleString()} UZS (${payment.typeSotuv})`,
          timestamp: payment.sana,
        }));
        setActivities([...saleActivities, ...paymentActivities].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      } catch (err: any) {
        console.error('Error fetching data:', err.response?.data || err.message);
        setError(err.response?.data?.detail || 'Ma\'lumotlarni yuklashda xatolik yuz berdi');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, user]);

  const formatToTashkentTime = (dateString: string) => {
    const date = new Date(dateString);
    const offsetMinutes = 5 * 60; // UTC+5 (Toshkent vaqt zonasi)
    const localOffsetMinutes = date.getTimezoneOffset();
    const tashkentTime = new Date(date.getTime() + (offsetMinutes + localOffsetMinutes) * 60 * 1000);
    return tashkentTime.toLocaleString('uz-UZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleAddDealer = () => {
    if (user?.role !== 'admin' && user?.role !== 'omborchi') {
      setError('Sizda yangi diler qo‘shish huquqi yo‘q.');
      return;
    }
    setIsModalOpen(true);
    setEditingDealerId(null);
    setNewDealer({ username: '', password: '', address: '', phone_number: '', balance: '' });
    setError(null);
  };

  const handleEditDealer = (id: number) => {
    if (user?.role !== 'admin' && user?.role !== 'omborchi') {
      setError('Sizda diler ma\'lumotlarini tahrirlash huquqi yo‘q.');
      return;
    }
    const dealerToEdit = dealers.find(dealer => dealer.id === id);
    if (dealerToEdit) {
      setNewDealer({
        username: dealerToEdit.username,
        password: '',
        address: dealerToEdit.address || '',
        phone_number: dealerToEdit.phone_number || '',
        balance: dealerToEdit.balance || '',
      });
      setEditingDealerId(id);
      setIsModalOpen(true);
      setError(null);
    }
  };

  const handleViewSales = (dealerId: number) => {
    setSelectedDealerId(dealerId);
    setShowSales(true);
    setIsSalesModalOpen(true);
  };

  const handleViewActivities = (dealerId: number) => {
    setSelectedDealerId(dealerId);
    setIsActivitiesModalOpen(true);
  };

  const handleViewProducts = (sale: Sale) => {
    setSelectedSale(sale);
    setIsProductsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewDealer(prev => ({ ...prev, [name]: value }));
  };

  const generateRandomEmail = (username: string) => {
    const existingEmails = dealers.map(d => d.email.split('@')[0].replace(username, '').replace(/[^0-9]/g, ''));
    let index = 1;
    while (existingEmails.includes(index.toString())) {
      index++;
    }
    return `${username}${index}@gmail.com`;
  };

  const handleSubmitDealer = async () => {
    if (user?.role !== 'admin' && user?.role !== 'omborchi') {
      setError('Sizda yangi diler qo‘shish huquqi yo‘q.');
      return;
    }

    if (!newDealer.username || (!editingDealerId && !newDealer.password)) {
      setError('Diler nomi va yangi diler uchun parol kiritilishi shart.');
      return;
    }

    setIsSubmitting(true);
    try {
      const generatedEmail = editingDealerId ? undefined : generateRandomEmail(newDealer.username);
      const dealerData = {
        username: newDealer.username,
        email: generatedEmail,
        password: newDealer.password || undefined,
        address: newDealer.address || null,
        phone_number: newDealer.phone_number || null,
        balance: newDealer.balance ? parseFloat(newDealer.balance).toFixed(2) : '0.00',
        user_type: 'dealer',
      };

      if (editingDealerId) {
        const updateData = { ...dealerData };
        if (!newDealer.password) delete updateData.password;
        delete updateData.email; // Tahrirlashda email o'zgarmaydi
        const response = await axios.put(`${BASE_URL}users/${editingDealerId}/`, updateData, apiConfig);
        setDealers(dealers.map(d => (d.id === editingDealerId ? response.data : d)));
      } else {
        const response = await axios.post(`${BASE_URL}users/`, dealerData, apiConfig);
        setDealers([...dealers, response.data]);
      }

      setIsModalOpen(false);
      setEditingDealerId(null);
      setNewDealer({ username: '', password: '', address: '', phone_number: '', balance: '' });
      setError(null);
    } catch (err: any) {
      console.error('Error submitting dealer:', err.response?.data || err.message);
      const errorMsg = err.response?.data?.detail || err.response?.data?.error || 'Diler qo‘shishda/yangilashda xatolik yuz berdi';
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDealer = async (id: number) => {
    if (user?.role !== 'admin' && user?.role !== 'omborchi') {
      setError('Sizda diler o‘chirish huquqi yo‘q.');
      return;
    }

    if (window.confirm('Ushbu dilerni o‘chirishni xohlaysizmi?')) {
      try {
        await axios.delete(`${BASE_URL}users/${id}/`, apiConfig);
        setDealers(dealers.filter(d => d.id !== id));
        setError(null);
      } catch (err: any) {
        console.error('Error deleting dealer:', err.response?.data || err.message);
        setError(err.response?.data?.detail || 'Diler o‘chirishda xatolik yuz berdi');
      }
    }
  };

  const handleSubmitPayment = async () => {
    if (!currentDealerId || !paymentAmount || isSubmitting) {
      setError('Summa kiritilishi shart yoki so‘rov allaqachon yuborilmoqda');
      return;
    }

    setIsSubmitting(true);
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      const paymentData = {
        user: currentDealerId,
        sana: currentDate,
        summa: parseFloat(paymentAmount).toFixed(2),
        typeSotuv: paymentType,
      };

      const response = await axios.post(`${BASE_URL}payments/`, paymentData, apiConfig);
      const newPayment = {
        id: response.data.id,
        dealerId: currentDealerId,
        amount: response.data.summa,
        date: response.data.sana,
        typeSotuv: response.data.typeSotuv,
      };
      setPayments([...payments, newPayment]);
      setActivities(prev => [
        {
          id: response.data.id,
          type: 'payment',
          description: `To‘lov: ${parseFloat(response.data.summa).toLocaleString()} UZS (${response.data.typeSotuv})`,
          timestamp: response.data.sana,
        },
        ...prev,
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

      const updatedDealerRes = await axios.get(`${BASE_URL}users/${currentDealerId}/`, apiConfig);
      setDealers(dealers.map(d => (d.id === currentDealerId ? updatedDealerRes.data : d)));
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentType('naqd');
      setCurrentDealerId(null);
      setError(null);
    } catch (err: any) {
      console.error('Error adding payment:', err.response?.data || err.message);
      setError(err.response?.data?.detail || 'To‘lov qo‘shishda xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : `Mahsulot #${productId}`;
  };

  const getProductImage = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product && product.rasm ? `${BASE_URL}${product.rasm}` : null;
  };

  const calculateTotalSales = (dealerId: number) => {
    return sales
      .filter(sale => sale.sotib_oluvchi === dealerId)
      .reduce((sum, sale) => sum + parseFloat(sale.total_sum), 0);
  };

  const calculateTotalPayments = (dealerId: number) => {
    return payments
      .filter(payment => payment.dealerId === dealerId)
      .reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
  };

  const filteredDealers = dealers.filter(dealer =>
    dealer.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dealer.address && dealer.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (dealer.phone_number && dealer.phone_number.includes(searchTerm))
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
            placeholder="Dilerlarni qidirish..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {(user?.role === 'admin' || user?.role === 'omborchi') && (
          <button
            onClick={handleAddDealer}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Diler qo‘shish
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredDealers.map((dealer) => (
          <div key={dealer.id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">{dealer.username}</h3>
                </div>
              </div>
              {(user?.role === 'admin' || user?.role === 'omborchi') && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditDealer(dealer.id)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 012.828 0l3.793 3.793a2 2 0 010 2.828l-9.5 9.5a2 2 0 01-1.061.586h-3a2 2 0 01-2-2v-3a2 2 0 01.586-1.061l9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteDealer(dealer.id)}
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
                {dealer.address || 'Manzil kiritilmagan'}
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Phone className="h-4 w-4 mr-2" />
                {dealer.phone_number || 'Telefon kiritilmagan'}
              </div>
              <div className="mt-2">
                <h4 className="text-sm font-medium text-gray-700">Balans</h4>
                <p className="text-sm text-gray-500">UZS: {parseFloat(dealer.balance).toLocaleString()}</p>
              </div>
              {(user?.role === 'admin' || user?.role === 'omborchi') && (
                <button
                  className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  onClick={() => {
                    setCurrentDealerId(dealer.id);
                    setIsPaymentModalOpen(true);
                  }}
                >
                  To‘lov qilish
                </button>
              )}
              <div className="mt-2 flex items-center gap-4">
                <span className={`text-sm ${dealer.is_active ? 'text-green-600' : 'text-red-600'}`}>
                  {dealer.is_active ? 'Aktiv' : 'Faol emas'}
                </span>
                <button
                  onClick={() => handleViewSales(dealer.id)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Sotuvlar tarixi
                </button>
                <button
                  onClick={() => handleViewActivities(dealer.id)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <Activity className="h-4 w-4 mr-1" />
                  Faoliyatlar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (user?.role === 'admin' || user?.role === 'omborchi') && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-medium mb-4">{editingDealerId ? 'Dilerni tahrirlash' : 'Yangi diler qo‘shish'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Foydalanuvchi nomi *</label>
                <input
                  type="text"
                  name="username"
                  value={newDealer.username}
                  onChange={handleInputChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Diler nomini kiriting"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Parol {editingDealerId ? '' : '*'}</label>
                <input
                  type="password"
                  name="password"
                  value={newDealer.password}
                  onChange={handleInputChange}
                  placeholder={editingDealerId ? 'Agar o‘zgartirmoqchi bo‘lsangiz kiriting' : 'Parol kiriting'}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required={!editingDealerId}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Manzil</label>
                <input
                  type="text"
                  name="address"
                  value={newDealer.address}
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
                  value={newDealer.phone_number}
                  onChange={handleInputChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Telefon kiriting"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Balans</label>
                <input
                  type="number"
                  name="balance"
                  value={newDealer.balance}
                  onChange={handleInputChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Balans kiriting (UZS)"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            {error && <div className="mt-4 text-red-600 text-sm">{error}</div>}
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                disabled={isSubmitting}
              >
                Bekor qilish
              </button>
              <button
                onClick={handleSubmitDealer}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isSubmitting}
              >
                {editingDealerId ? 'Yangilash' : 'Qo‘shish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isPaymentModalOpen && (user?.role === 'admin' || user?.role === 'omborchi') && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-medium mb-4">To‘lov qilish</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Summa</label>
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
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                disabled={isSubmitting}
              >
                Bekor qilish
              </button>
              <button
                onClick={handleSubmitPayment}
                disabled={isSubmitting}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                To‘lovni tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {isSalesModalOpen && selectedDealerId && (
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
                        Sana va vaqt
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
                      .filter(sale => sale.sotib_oluvchi === selectedDealerId)
                      .map((sale) => (
                        <tr key={sale.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatToTashkentTime(sale.time)}
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
                        Sana va vaqt
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
                      .filter(payment => payment.dealerId === selectedDealerId)
                      .map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatToTashkentTime(payment.date)}
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
                ? calculateTotalSales(selectedDealerId).toLocaleString() 
                : calculateTotalPayments(selectedDealerId).toLocaleString()} UZS
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

      {isActivitiesModalOpen && selectedDealerId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl">
            <h2 className="text-lg font-medium mb-4">Diler faoliyatlari</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sana va vaqt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fa _

oliyat turi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tavsif
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activities
                    .filter(activity => 
                      (activity.type === 'sale' && sales.some(s => s.id === activity.id && s.sotib_oluvchi === selectedDealerId)) ||
                      (activity.type === 'payment' && payments.some(p => p.id === activity.id && p.dealerId === selectedDealerId))
                    )
                    .map((activity) => (
                      <tr key={activity.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatToTashkentTime(activity.timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {activity.type === 'sale' ? 'Sotuv' : 'To‘lov'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {activity.description}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsActivitiesModalOpen(false)}
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