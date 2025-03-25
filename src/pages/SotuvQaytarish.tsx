import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Trash2, Printer, Check, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import Barcode from 'react-barcode';

const BASE_URL = 'https://lemoonapi.cdpos.uz:444/';

interface Product {
  id: number;
  name: string;
  narx: number | string;
  stock?: number;
}

interface CartItem {
  productId: number;
  quantity: number;
  price: number;
  isDefective: boolean;
}

interface Ombor {
  id: number;
  name: string;
  responsible_person: number;
}

interface User {
  id: number;
  username: string;
  user_type?: string;
  created_by?: number;
}

interface DealerRequest {
  id: number;
  dealer?: number | null;
  shop: number;
  condition: 'healthy' | 'unhealthy';
  status: 'pending' | 'approved' | 'rejected';
  total_sum: string;
  time: string;
  items: { product: number; quantity: number; price: string }[];
}

const DealerRequestPage: React.FC = () => {
  const { token, user } = useAuthStore();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isDefective, setIsDefective] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [userOmbors, setUserOmbors] = useState<Ombor[]>([]); // Bir nechta ombor uchun
  const [selectedOmbor, setSelectedOmbor] = useState<number | null>(null); // Tanlangan ombor
  const [users, setUsers] = useState<User[]>([]);
  const [selectedShop, setSelectedShop] = useState<number | null>(null);
  const [selectedDealer, setSelectedDealer] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalSum, setTotalSum] = useState(0);
  const [requestReceipt, setRequestReceipt] = useState<DealerRequest | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [requests, setRequests] = useState<DealerRequest[]>([]);
  const receiptRef = useRef<HTMLDivElement>(null);

  const apiConfig = {
    headers: { Authorization: `JWT ${token}` },
  };

  const fetchData = async () => {
    if (!token || !user) {
      setError('Autentifikatsiya tokeni yoki foydalanuvchi topilmadi.');
      setLoading(false);
      return;
    }

    try {
      // Omborlarni olish
      const omborRes = await axios.get(`${BASE_URL}omborlar/`, apiConfig);
      let omborData = omborRes.data.results || omborRes.data;
      if (user.user_type === 'dealer' || user.user_type === 'shop') {
        omborData = omborData.filter((o: Ombor) => o.responsible_person === user.id);
      }
      setUserOmbors(omborData);
      setSelectedOmbor(omborData.length > 0 ? omborData[0].id : null); // Birinchi ombor default tanlanadi

      // Foydalanuvchilarni olish (admin bo‘lmaganlar)
      const usersRes = await axios.get(`${BASE_URL}users/?user_type__ne=admin`, apiConfig);
      let usersData = usersRes.data.results || usersRes.data;
      setUsers(usersData);

      // Mahsulotlarni olish
      const productsRes = await axios.get(`${BASE_URL}mahsulotlar/`, apiConfig);
      const omborMahsulotRes = await axios.get(`${BASE_URL}ombor_mahsulot/`, apiConfig);
      let omborMahsulotData = omborMahsulotRes.data.results || omborMahsulotRes.data;

      if (user.user_type === 'dealer' || user.user_type === 'shop') {
        omborMahsulotData = omborMahsulotData.filter((om: any) =>
          omborData.some((o: Ombor) => o.id === om.ombor)
        );
      }

      const enrichedProducts = (productsRes.data.results || productsRes.data).map((product: Product) => {
        const omborMahsulot = omborMahsulotData.find((om: any) =>
          omborData.some((o: Ombor) => o.id === om.ombor && om.mahsulot === product.id)
        );
        return {
          ...product,
          narx: typeof product.narx === 'string' ? parseFloat(product.narx) : product.narx,
          stock: omborMahsulot ? omborMahsulot.soni : 0,
        };
      });
      setProducts(enrichedProducts);

      // Diler so‘rovlarini olish
      const requestsRes = await axios.get(`${BASE_URL}dealer-requests/`, apiConfig);
      setRequests(requestsRes.data.results || requestsRes.data);
    } catch (err: any) {
      console.error('Ma\'lumotlarni yuklashda xatolik:', err.response?.data || err.message);
      setError(
        err.response?.data?.detail || 
        (err.response?.data && typeof err.response.data === 'object' 
          ? JSON.stringify(err.response.data) 
          : 'Ma\'lumotlarni yuklashda xatolik yuz berdi')
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchData();
    } else {
      setError('Foydalanuvchi yoki token yuklanmadi.');
      setLoading(false);
    }
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

  const openPriceModal = () => {
    const product = products.find((p) => p.id === selectedProduct);
    if (product) {
      setCustomPrice(typeof product.narx === 'string' ? parseFloat(product.narx) : product.narx);
      setIsPriceModalOpen(true);
    }
  };

  const saveCustomPrice = () => {
    if (customPrice <= 0) {
      setError('Narx 0 dan katta bo‘lishi kerak');
      return;
    }
    setIsPriceModalOpen(false);
    setError(null);
    addToCartWithCustomPrice();
  };

  const addToCartWithCustomPrice = () => {
    if (!selectedProduct || quantity <= 0) {
      setError('Mahsulot tanlang va to‘g‘ri miqdorni kiriting');
      return;
    }

    const product = products.find((p) => p.id === selectedProduct);
    if (!product) {
      setError('Mahsulot topilmadi');
      return;
    }
    if (product.stock < quantity) {
      setError(`Stokda ${product.name} uchun ${product.stock} dona mavjud, ${quantity} dona so‘raldi`);
      return;
    }

    const priceToUse = customPrice || (typeof product.narx === 'string' ? parseFloat(product.narx) : product.narx);

    const existingItem = cart.find((item) => item.productId === selectedProduct);
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (product.stock < newQuantity) {
        setError(`Stokda ${product.name} uchun ${product.stock} dona mavjud, ${newQuantity} dona so‘raldi`);
        return;
      }
      setCart(
        cart.map((item) =>
          item.productId === selectedProduct
            ? { ...item, quantity: newQuantity, price: priceToUse, isDefective }
            : item
        )
      );
    } else {
      setCart([...cart, { productId: selectedProduct, quantity, price: priceToUse, isDefective }]);
    }
    setTotalSum(cart.reduce((sum, item) => sum + item.quantity * item.price, 0) + quantity * priceToUse);
    setSelectedProduct(null);
    setQuantity(1);
    setIsDefective(false);
    setSearchQuery('');
    setCustomPrice(0);
    setError(null);
  };

  const addToCart = () => {
    addToCartWithCustomPrice();
  };

  const removeFromCart = (productId: number) => {
    const item = cart.find((i) => i.productId === productId);
    if (item) {
      setTotalSum(totalSum - item.quantity * item.price);
    }
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const processRequest = async () => {
    if (!selectedOmbor) {
      setError('Ombor tanlanmagan');
      return;
    }

    if (!selectedShop) {
      setError('Do‘kon tanlanmagan');
      return;
    }

    const shopUser = users.find((u) => u.id === selectedShop);
    if (!shopUser || shopUser.user_type !== 'shop') {
      setError('Tanlangan foydalanuvchi do‘kon turi bo‘lishi kerak');
      return;
    }

    if (cart.length === 0) {
      setError('Savatda mahsulot yo‘q');
      return;
    }

    try {
      const allDefective = cart.every((item) => item.isDefective);
      const condition = allDefective ? 'unhealthy' : 'healthy';

      const requestData = {
        dealer: user.user_type === 'dealer' ? user.id : selectedDealer || null,
        shop: selectedShop,
        condition,
        items: cart.map((item) => ({
          product: item.productId,
          quantity: item.quantity,
          price: parseFloat(item.price.toFixed(2)),
        })),
      };

      console.log("Yuborilayotgan so‘rov ma'lumoti (/dealer-requests/):", requestData);
      const requestRes = await axios.post(`${BASE_URL}dealer-requests/`, requestData, apiConfig);
      console.log("So‘rov javobi:", requestRes.data);

      const requestRecord: DealerRequest = {
        id: requestRes.data.id,
        dealer: requestRes.data.dealer || null,
        shop: requestRes.data.shop,
        condition: requestRes.data.condition,
        status: requestRes.data.status,
        total_sum: requestRes.data.total_sum, // Backenddan qaytgan qiymat
        time: requestRes.data.created_at || new Date().toISOString(),
        items: cart.map((item) => ({
          product: item.productId,
          quantity: item.quantity,
          price: item.price.toFixed(2),
        })),
      };
      setRequestReceipt(requestRecord);
      setIsReceiptModalOpen(true);

      setCart([]);
      setTotalSum(0);
      setSelectedShop(null);
      setSelectedDealer(null);
      setError(null);
      await fetchData();
    } catch (err: any) {
      console.error('So‘rovni saqlashda xatolik (/dealer-requests/):', err.response?.data || err.message);
      setError(
        err.response?.data?.detail || 
        (err.response?.data && typeof err.response.data === 'object' 
          ? JSON.stringify(err.response.data) 
          : 'So‘rovni saqlashda xatolik yuz berdi')
      );
    }
  };

  const approveRequest = async (requestId: number) => {
    try {
      await axios.post(`${BASE_URL}dealer-requests/${requestId}/approve/`, {}, apiConfig);
      setRequests(requests.map((req) => (req.id === requestId ? { ...req, status: 'approved' } : req)));
      await fetchData();
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 
        (err.response?.data && typeof err.response.data === 'object' 
          ? JSON.stringify(err.response.data) 
          : 'So‘rovni tasdiqlashda xatolik yuz berdi')
      );
    }
  };

  const rejectRequest = async (requestId: number) => {
    try {
      await axios.post(`${BASE_URL}dealer-requests/${requestId}/reject/`, {}, apiConfig);
      setRequests(requests.map((req) => (req.id === requestId ? { ...req, status: 'rejected' } : req)));
      await fetchData();
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 
        (err.response?.data && typeof err.response.data === 'object' 
          ? JSON.stringify(err.response.data) 
          : 'So‘rovni rad etishda xatolik yuz berdi')
      );
    }
  };

  const generateReceipt = () => {
    if (!requestReceipt || !receiptRef.current) return;

    const opt = {
      margin: 0.5,
      filename: `receipt_dealer_request_${requestReceipt.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
    };

    html2pdf().from(receiptRef.current).set(opt).save();
  };

  const printReceipt = () => {
    if (!requestReceipt || !receiptRef.current) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>Chek - Diler So‘rov #${requestReceipt.id}</title>
        <style>
          body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; font-size: 12px; line-height: 1.5; }
          .receipt { width: 80mm; margin: 0 auto; border: 2px solid #000; padding: 15px; background-color: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 15px; }
          .header h2 { font-size: 16px; font-weight: bold; color: #333; margin: 0 0 5px; }
          .header p { margin: 0; font-size: 10px; color: #666; }
          .details { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; color: #333; }
          .items { margin: 15px 0; }
          .items table { width: 100%; border-collapse: collapse; }
          .items th, .items td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; }
          .items th { background-color: #f5f5f5; font-weight: bold; }
          .total { margin-top: 15px; text-align: right; font-weight: bold; font-size: 14px; color: #000; }
          .footer { margin-top: 15px; text-align: center; font-size: 10px; color: #666; }
          .scanners { display: flex; justify-content: space-between; margin-top: 15px; }
          .barcode, .qr-code { flex: 1; text-align: center; }
          .barcode img, .qr-code img { width: 100px; height: auto; }
        </style></head><body>
        <div class="receipt">${receiptRef.current.innerHTML}</div>
        </body></html>`);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getUsername = (userId: number | null) => {
    if (!userId) return 'Admin';
    const user = users.find((u) => u.id === userId);
    return user ? user.username : `Foydalanuvchi #${userId}`;
  };

  const getProductName = (productId: number) => {
    const product = products.find((p) => p.id === productId);
    return product ? product.name : `Mahsulot #${productId}`;
  };

  if (loading) return <div className="p-6">Yuklanmoqda...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center">
        <ShoppingCart className="mr-2" />
        Diler So‘rov
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          {user?.user_type === 'admin' && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Diler (Ixtiyoriy)</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md"
                value={selectedDealer || ''}
                onChange={(e) => setSelectedDealer(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Diler tanlamaslik</option>
                {users.filter((u) => u.user_type === 'dealer').map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Do‘kon</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={selectedShop || ''}
              onChange={(e) => setSelectedShop(e.target.value ? Number(e.target.value) : null)}
              disabled={user?.user_type === 'shop'}
            >
              <option value="">Do‘kon tanlang</option>
              {users.filter((u) => u.user_type === 'shop').map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Tanlangan Ombor</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={selectedOmbor || ''}
              onChange={(e) => setSelectedOmbor(e.target.value ? Number(e.target.value) : null)}
              disabled={userOmbors.length <= 1} // Agar faqat bitta ombor bo‘lsa, o‘chiriladi
            >
              {userOmbors.length === 0 ? (
                <option value="">Ombor topilmadi</option>
              ) : (
                userOmbors.map((ombor) => (
                  <option key={ombor.id} value={ombor.id}>
                    {ombor.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <h2 className="text-lg font-medium mb-4">Mahsulot Tanlash</h2>
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Nomi yoki ID bo‘yicha qidiring"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  const foundProduct = products.find(
                    (p) =>
                      p.name.toLowerCase().includes(e.target.value.toLowerCase()) ||
                      p.id.toString().includes(e.target.value)
                  );
                  if (foundProduct) {
                    setSelectedProduct(foundProduct.id);
                  }
                }}
              />
              {searchQuery && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {products
                    .filter(
                      (p) =>
                        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.id.toString().includes(searchQuery)
                    )
                    .map((product) => (
                      <div
                        key={product.id}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setSelectedProduct(product.id);
                          setSearchQuery(product.name);
                          setSearchQuery('');
                        }}
                      >
                        {product.name} (ID: {product.id}, Stok: {product.stock || 0})
                      </div>
                    ))}
                </div>
              )}
            </div>

            {selectedProduct && (
              <div className="text-sm font-medium">
                Tanlangan: {products.find((p) => p.id === selectedProduct)?.name}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Soni</label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={quantity}
                min={1}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">Narx</label>
                <input
                  type="number"
                  className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                  value={
                    customPrice > 0
                      ? customPrice
                      : selectedProduct
                      ? typeof products.find((p) => p.id === selectedProduct)?.narx === 'string'
                        ? parseFloat(products.find((p) => p.id === selectedProduct)?.narx || '0')
                        : products.find((p) => p.id === selectedProduct)?.narx || 0
                      : 0
                  }
                  disabled
                />
              </div>
              <button
                className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                onClick={openPriceModal}
                disabled={!selectedProduct}
              >
                Narxni O‘zgartirish
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Holati</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md"
                value={isDefective ? 'true' : 'false'}
                onChange={(e) => setIsDefective(e.target.value === 'true')}
              >
                <option value="false">So‘g‘lom</option>
                <option value="true">Noso‘g‘lom</option>
              </select>
            </div>

            {error && <div className="text-red-500 text-sm">{error}</div>}

            <button
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              onClick={addToCart}
            >
              Savatga Qo‘shish
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-medium mb-4">Savat</h2>
          <div className="space-y-4">
            {cart.length === 0 ? (
              <div className="text-gray-500">Savat bo‘sh</div>
            ) : (
              <>
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">
                          {products.find((p) => p.id === item.productId)?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.quantity} x {item.price.toLocaleString()} UZS (
                          {item.isDefective ? 'Noso‘g‘lom' : 'So‘g‘lom'})
                        </div>
                      </div>
                      <button
                        className="text-red-500 hover:text-red-700"
                        onClick={() => removeFromCart(item.productId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between font-medium">
                    <span>Jami Summa:</span>
                    <span>{totalSum.toLocaleString()} UZS</span>
                  </div>
                </div>

                <button
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  onClick={processRequest}
                  disabled={cart.length === 0 || !selectedShop}
                >
                  So‘rovni Yuborish
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {user?.user_type === 'admin' && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-medium mb-4">Kutilayotgan So‘rovlar</h2>
          {requests.length === 0 ? (
            <div className="text-gray-500">So‘rovlar mavjud emas</div>
          ) : (
            <div className="space-y-4">
              {requests
                .filter((req) => req.status === 'pending')
                .map((req) => (
                  <div key={req.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                    <div className="font-medium">
  So‘rov #{req.id} - {getUsername(req.dealer)} -&gt; {getUsername(req.shop)}
</div>
                      <div className="text-sm text-gray-500">
                        Jami: {parseFloat(req.total_sum).toLocaleString()} UZS | Holat:{' '}
                        {req.condition === 'healthy' ? 'So‘g‘lom' : 'Noso‘g‘lom'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600"
                        onClick={() => approveRequest(req.id)}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600"
                        onClick={() => rejectRequest(req.id)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {isPriceModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-lg font-medium mb-4">Narxni O‘zgartirish</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Yangi Narx (UZS)</label>
                <input
                  type="number"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={customPrice}
                  min={0}
                  onChange={(e) => setCustomPrice(Number(e.target.value))}
                />
              </div>
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <div className="flex justify-end gap-2">
                <button
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  onClick={() => {
                    setIsPriceModalOpen(false);
                    setCustomPrice(0);
                    setError(null);
                  }}
                >
                  Bekor Qilish
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  onClick={saveCustomPrice}
                >
                  Saqlash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isReceiptModalOpen && requestReceipt && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl">
            <h2 className="text-lg font-medium mb-4">So‘rov Muvaffaqiyatli Yuborildi!</h2>
            <p className="mb-4 text-gray-600">Chekni quyida ko‘rib chiqing va boshqarishingiz mumkin:</p>

            <div ref={receiptRef} className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
              <div className="receipt">
                <div className="header">
                  <h2>Farg'ona viloyati, Bag'dod tumani "LEMOON" marketi</h2>
                  <div className="details">
                    <p>So‘rov raqami: {requestReceipt.id}</p>
                    <p>Sana va vaqt: {formatToTashkentTime(requestReceipt.time)}</p>
                  </div>
                  <p>Kassa: {user?.username || 'Noma\'lum'}</p>
                </div>
                <div className="items">
                  <table>
                    <thead>
                      <tr>
                        <th>Nomi</th>
                        <th>Soni</th>
                        <th>Narx (UZS)</th>
                        <th>Holati</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requestReceipt.items.map((item, index) => (
                        <tr key={index}>
                          <td>{getProductName(item.product)}</td>
                          <td>{item.quantity}</td>
                          <td>{parseFloat(item.price).toLocaleString()}</td>
                          <td>{requestReceipt.condition === 'healthy' ? 'So‘g‘lom' : 'Noso‘g‘lom'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="total">
                  Jami: {parseFloat(requestReceipt.total_sum).toLocaleString()} UZS
                </div>
                <div className="footer">
                  <div className="details">
                    <p>Diler: {getUsername(requestReceipt.dealer)}</p>
                    <p>Do‘kon: {getUsername(requestReceipt.shop)}</p>
                  </div>
                  <div className="details">
                    <p>RRN: {requestReceipt.id.toString().padStart(12, '0')}</p>
                    <p>So‘rov raqami: {requestReceipt.id}</p>
                  </div>
                  <div className="scanners">
                    <div className="barcode">
                      <Barcode value={`DEALER_REQUEST-${requestReceipt.id}`} height={30} width={1} fontSize={10} />
                    </div>
                    <div className="qr-code">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=DealerRequest_ID_${requestReceipt.id}`}
                        alt="QR Code"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                onClick={generateReceipt}
              >
                <span>Yuklab Olish (PDF)</span>
              </button>
              <button
                className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                onClick={printReceipt}
              >
                <Printer className="h-4 w-4" /> Print Qilish
              </button>
              <button
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                onClick={() => setIsReceiptModalOpen(false)}
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealerRequestPage;