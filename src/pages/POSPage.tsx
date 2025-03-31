import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Trash2, Printer } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
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
}

interface Ombor {
  id: number;
  name: string;
  responsible_person: number;
}

interface User {
  id: number;
  username: string;
  user_type: string;
  created_by?: number;
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

const POSPage: React.FC = () => {
  const { token, user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [userOmbor, setUserOmbor] = useState<Ombor | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalSum, setTotalSum] = useState(0);
  const [saleReceipt, setSaleReceipt] = useState<Sale | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [customPrice, setCustomPrice] = useState<number>(0);
  const receiptRef = useRef<HTMLDivElement>(null);

  const apiConfig = {
    headers: { Authorization: `JWT ${token}` },
  };

  const fetchAllProducts = async (url: string, config: any, accumulated: Product[] = []): Promise<Product[]> => {
    try {
      const baseUrl = 'https://lemoonapi.cdpos.uz:444';
      const fetchUrl = url.includes(baseUrl) ? url : `${baseUrl}/mahsulotlar/`;
      const res = await axios.get(fetchUrl, config);
      const data = res.data.results || res.data;
      const allProducts = [...accumulated, ...data];

      if (res.data.next) {
        const correctedNextUrl = res.data.next.replace(/http:\/\/[^\/]+/, baseUrl);
        return fetchAllProducts(correctedNextUrl, config, allProducts);
      }
      return allProducts;
    } catch (err) {
      console.error('Mahsulotlarni yuklashda xatolik:', err);
      throw err;
    }
  };

  const fetchData = async () => {
    if (!token || !user) {
      setError('Autentifikatsiya tokeni yoki foydalanuvchi topilmadi.');
      setLoading(false);
      return;
    }

    try {
      const omborRes = await axios.get(`${BASE_URL}omborlar/`, apiConfig);
      let omborData = omborRes.data.results || omborRes.data;
      if (user.role === 'dealer' || user.role === 'shop') {
        omborData = omborData.filter((o: Ombor) => o.responsible_person === user.id);
      }
      setUserOmbor(omborData[0] || null);

      const usersRes = await axios.get(`${BASE_URL}users/`, apiConfig);
      let usersData = usersRes.data.results || usersRes.data;

      if (user.role === 'admin') {
        usersData = usersData.filter((u: User) => u.user_type === 'dealer');
      } else if (user.role === 'dealer') {
        usersData = usersData.filter((u: User) => u.user_type === 'shop' && u.created_by === user.id);
      } else if (user.role === 'shop') {
        usersData = [user];
      }
      setUsers(usersData);

      const productsRes = await fetchAllProducts(`${BASE_URL}mahsulotlar/`, apiConfig);
      const omborMahsulotRes = await axios.get(`${BASE_URL}ombor_mahsulot/`, apiConfig);
      let omborMahsulotData = omborMahsulotRes.data.results || omborMahsulotData;

      if (user.role === 'dealer' || user.role === 'shop') {
        omborMahsulotData = omborMahsulotData.filter((om: any) => omborData.some((o: Ombor) => o.id === om.ombor));
      }

      const enrichedProducts = productsRes.map((product: Product) => {
        const omborMahsulot = omborMahsulotData.find(
          (om: any) => om.mahsulot === product.id && omborData.some((o: Ombor) => o.id === om.ombor)
        );
        return {
          ...product,
          narx: typeof product.narx === 'string' ? parseFloat(product.narx) : product.narx,
          stock: omborMahsulot ? omborMahsulot.soni : 0,
        };
      });
      setProducts(enrichedProducts);
    } catch (err: any) {
      console.error('Ma\'lumotlarni yuklashda xatolik:', err.response?.data || err.message);
      setError(err.response?.data?.detail || 'Ma\'lumotlarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, user]);

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

    if (product.stock !== undefined && product.stock < quantity) {
      setError(`Omborda ${product.name} yetarli emas (Mavjud: ${product.stock})`);
      return;
    }

    const priceToUse = customPrice || (typeof product.narx === 'string' ? parseFloat(product.narx) : product.narx);

    const existingItem = cart.find((item) => item.productId === selectedProduct);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.productId === selectedProduct
            ? { ...item, quantity: item.quantity + quantity, price: priceToUse }
            : item
        )
      );
    } else {
      setCart([...cart, { productId: selectedProduct, quantity, price: priceToUse }]);
    }
    setTotalSum(cart.reduce((sum, item) => sum + item.quantity * item.price, 0) + quantity * priceToUse);
    setSelectedProduct(null);
    setQuantity(1);
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

  const processSale = async () => {
    if (!userOmbor) {
      setError('Ombor tanlanmagan');
      console.error('Xatolik: Ombor tanlanmagan');
      return;
    }

    if (!selectedBuyer) {
      setError('Sotib oluvchi tanlanmagan');
      console.error('Xatolik: Sotib oluvchi tanlanmagan');
      return;
    }

    if (cart.length === 0) {
      setError('Savatda mahsulot yo‘q');
      console.error('Xatolik: Savatda mahsulot yo‘q');
      return;
    }

    try {
      const currentDate = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent' });

      const saleData = {
        ombor: userOmbor.id,
        sotib_oluvchi: selectedBuyer,
        sana: currentDate,
        total_sum: totalSum.toFixed(2),
        time: currentTime,
        items: cart.map((item) => ({
          mahsulot: item.productId,
          soni: item.quantity,
          narx: item.price.toFixed(2),
        })),
      };

      const response = await axios.post(`${BASE_URL}sotuvlar/`, saleData, apiConfig);
      setSaleReceipt(response.data);
      setIsReceiptModalOpen(true);

      const omborMahsulotRes = await axios.get(`${BASE_URL}ombor_mahsulot/`, apiConfig);
      let omborMahsulotData = omborMahsulotRes.data.results || omborMahsulotRes.data;

      if (user.role === 'dealer' || user.role === 'shop') {
        omborMahsulotData = omborMahsulotData.filter((om: any) => om.ombor === userOmbor.id);
      }

      const updatedProducts = products.map((product) => {
        const omborMahsulot = omborMahsulotData.find((om: any) => om.mahsulot === product.id);
        return {
          ...product,
          stock: omborMahsulot ? omborMahsulot.soni : 0,
        };
      });
      setProducts(updatedProducts);

      setCart([]);
      setTotalSum(0);
      setSelectedBuyer(null);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Sotuvni amalga oshirishda xatolik');
      console.error('Sotuv xatosi:', err.response?.data || err.message);
    }
  };

  const printReceipt = () => {
    if (receiptRef.current) {
      const opt = {
        margin: 0.5,
        filename: `receipt_${saleReceipt?.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      };
      html2pdf().set(opt).from(receiptRef.current).save();
    }
  };

  if (loading) return <div className="p-6">Yuklanmoqda...</div>;
  if (error && !products.length) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center">
        <ShoppingCart className="mr-2" />
        Savdo Nuqtasi
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Sotib Oluvchi</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={selectedBuyer || ''}
              onChange={(e) => setSelectedBuyer(e.target.value ? Number(e.target.value) : null)}
              disabled={user?.role === 'shop'}
            >
              <option value="">Sotib oluvchi tanlang</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Tanlangan Ombor</label>
            <input
              type="text"
              value={userOmbor?.name || 'Ombor topilmadi'}
              className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
              disabled
            />
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
          {cart.length === 0 ? (
            <p className="text-gray-500">Savat bo‘sh</p>
          ) : (
            <>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {cart.map((item) => {
                  const product = products.find((p) => p.id === item.productId);
                  return (
                    <div key={item.productId} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{product?.name || 'Noma’lum mahsulot'}</p>
                        <p className="text-sm text-gray-600">
                          {item.quantity} x {item.price.toLocaleString()} UZS
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <p className="font-medium">{(item.quantity * item.price).toLocaleString()} UZS</p>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 border-t pt-4">
                <div className="flex justify-between text-lg font-medium">
                  <span>Jami:</span>
                  <span>{totalSum.toLocaleString()} UZS</span>
                </div>
                <button
                  className="mt-4 w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  onClick={processSale}
                >
                  Sotish
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {isPriceModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-medium mb-4">Narxni O‘zgartirish</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">Yangi Narx</label>
              <input
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(Number(e.target.value))}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                min={0}
              />
            </div>
            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => {
                  setIsPriceModalOpen(false);
                  setCustomPrice(0);
                  setError(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Bekor qilish
              </button>
              <button
                onClick={saveCustomPrice}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {isReceiptModalOpen && saleReceipt && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <div ref={receiptRef} className="text-center">
              <h2 className="text-lg font-bold mb-4">Sotuv Cheki</h2>
              <p>ID: {saleReceipt.id}</p>
              <p>Sana: {saleReceipt.sana}</p>
              <p>Vaqt: {saleReceipt.time}</p>
              <p>Sotib oluvchi: {users.find((u) => u.id === saleReceipt.sotib_oluvchi)?.username || 'Noma’lum'}</p>
              <p>Ombor: {userOmbor?.name}</p>
              <div className="mt-4">
                <table className="w-full text-left">
                  <thead>
                    <tr>
                      <th>Mahsulot</th>
                      <th>Soni</th>
                      <th>Narx</th>
                      <th>Jami</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleReceipt.items.map((item, index) => (
                      <tr key={index}>
                        <td>{products.find((p) => p.id === item.mahsulot)?.name || 'Noma’lum'}</td>
                        <td>{item.soni}</td>
                        <td>{parseFloat(item.narx).toLocaleString()} UZS</td>
                        <td>{(item.soni * parseFloat(item.narx)).toLocaleString()} UZS</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 border-t pt-2">
                <p className="font-bold">Jami: {parseFloat(saleReceipt.total_sum).toLocaleString()} UZS</p>
              </div>
              <div className="mt-4">
                <Barcode value={`SALE-${saleReceipt.id}`} height={50} width={1} />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Yopish
              </button>
              <button
                onClick={printReceipt}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <Printer className="h-5 w-5 mr-2" />
                Chop etish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSPage;