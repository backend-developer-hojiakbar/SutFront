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

      const productsRes = await axios.get(`${BASE_URL}mahsulotlar/`, apiConfig);
      const omborMahsulotRes = await axios.get(`${BASE_URL}ombor_mahsulot/`, apiConfig);
      let omborMahsulotData = omborMahsulotRes.data.results || omborMahsulotRes.data;

      if (user.role === 'dealer' || user.role === 'shop') {
        omborMahsulotData = omborMahsulotData.filter((om: any) => omborData.some((o: Ombor) => o.id === om.ombor));
      }

      const enrichedProducts = (productsRes.data.results || productsRes.data).map((product: Product) => {
        const omborMahsulot = omborMahsulotData.find((om: any) => om.mahsulot === product.id && omborData.some((o: Ombor) => o.id === om.ombor));
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
      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formatida sana
      const sotuvData = {
        sotib_oluvchi: selectedBuyer,
        ombor: userOmbor.id,
        sana: currentDate, // Aniqlik kiritildi: sana qo‘shildi
        total_sum: parseFloat(totalSum.toFixed(2)),
        items: cart.map((item) => ({
          mahsulot: item.productId,
          soni: item.quantity,
          narx: parseFloat(item.price.toFixed(2)),
        })),
      };

      console.log("Yuborilayotgan sotuv ma'lumoti (/sotuvlar/):", sotuvData);
      const sotuvRes = await axios.post(`${BASE_URL}sotuvlar/`, sotuvData, apiConfig);
      console.log("Sotuv javobi:", sotuvRes.data);

      const sale: Sale = {
        id: sotuvRes.data.id,
        sana: sotuvRes.data.sana || currentDate, // Backend’dan kelmasa default sana
        sotib_oluvchi: selectedBuyer,
        total_sum: totalSum.toFixed(2),
        ombor: userOmbor.id,
        time: sotuvRes.data.time || new Date().toISOString(), // Backend’dan `time` olish
        items: sotuvData.items.map((item) => ({
          mahsulot: item.mahsulot,
          soni: item.soni,
          narx: item.narx.toString(),
        })),
      };
      setSaleReceipt(sale);
      setIsReceiptModalOpen(true);

      setCart([]);
      setTotalSum(0);
      setSelectedBuyer(null);
      setError(null);
      await fetchData();
    } catch (err: any) {
      console.error('Sotuvni saqlashda xatolik (/sotuvlar/):', err.response?.data || err.message);
      setError(err.response?.data?.detail || 'Sotuvni saqlashda xatolik yuz berdi');
    }
  };

  const generateReceipt = () => {
    if (!saleReceipt || !receiptRef.current) return;

    const opt = {
      margin: 0.5,
      filename: `receipt_sotuv_${saleReceipt.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
    };

    html2pdf().from(receiptRef.current).set(opt).save();
  };

  const printReceipt = () => {
    if (!saleReceipt || !receiptRef.current) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>Chek - Sotuv #${saleReceipt.id}</title>
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

  const getUsername = (userId: number) => {
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
                <option key={u.id} value={u.id}>{u.username}</option>
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
                  const foundProduct = products.find((p) =>
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
                    .filter((p) =>
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
                className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
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
                          {item.quantity} x {item.price.toLocaleString()} UZS
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
                  onClick={processSale}
                  disabled={cart.length === 0 || !selectedBuyer}
                >
                  Sotish
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Narx o‘zgartirish modali */}
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

      {/* Chek modal */}
      {isReceiptModalOpen && saleReceipt && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl">
            <h2 className="text-lg font-medium mb-4">Sotuv Muvaffaqiyatli Yakunlandi!</h2>
            <p className="mb-4 text-gray-600">Chekni quyida ko‘rib chiqing va boshqarishingiz mumkin:</p>

            <div ref={receiptRef} className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
              <div className="receipt">
                <div className="header">
                  <h2>Farg'ona viloyati, Bag'dod tumani "LEMOON" marketi</h2>
                  <div className="details">
                    <p>Kassa raqami: {saleReceipt.id}</p>
                    <p>Sana: {new Date(saleReceipt.sana).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <p>Vaqt: {new Date(saleReceipt.time).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                  <p>Kassa: {user?.username || 'Noma\'lum'}</p>
                </div>
                <div className="items">
                  <table>
                    <thead>
                      <tr>
                        <th>Nomi</th>
                        <th>Soni</th>
                        <th>Narx (UZS)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saleReceipt.items.map((item, index) => (
                        <tr key={index}>
                          <td>{getProductName(item.mahsulot)}</td>
                          <td>{item.soni}</td>
                          <td>{parseFloat(item.narx).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="total">
                  Jami: {parseFloat(saleReceipt.total_sum).toLocaleString()} UZS
                </div>
                <div className="footer">
                  <div className="details">
                    <p>Sotib oluvchi: {getUsername(saleReceipt.sotib_oluvchi)}</p>
                    <p>Ombor: {userOmbor?.name || 'Noma\'lum'}</p>
                  </div>
                  <div className="details">
                    <p>RRN: {saleReceipt.id.toString().padStart(12, '0')}</p>
                    <p>Chek raqami: {saleReceipt.id}</p>
                  </div>
                  <div className="scanners">
                    <div className="barcode">
                      <Barcode value={`SOTUV-${saleReceipt.id}`} height={30} width={1} fontSize={10} />
                    </div>
                    <div className="qr-code">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=Sotuv_ID_${saleReceipt.id}`} alt="QR Code" />
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

export default POSPage;