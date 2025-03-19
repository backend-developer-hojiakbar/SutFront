import React, { useState, useEffect } from 'react';
import { Warehouse, MapPin, Package, Search, User, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

interface Warehouse {
  id: number;
  name: string;
  address: string;
  current_stock: number;
  responsible_person: number | null;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  narx: number;
  birlik: number | null;
  kategoriya: number | null;
}

interface Birlik {
  id: number;
  name: string;
}

interface Kategoriya {
  id: number;
  name: string;
}

interface Purchase {
  id: number;
  ombor: number;
  sana: string;
  yetkazib_beruvchi: number;
  total_sum: number;
  items: PurchaseItem[];
}

interface PurchaseItem {
  id?: number;
  mahsulot: number; // ID sifatida kelishi mumkin
  soni: number;
  narx: string;
  yaroqlilik_muddati: string | null;
}

interface ProductEntry {
  product: string;
  quantity: string;
  narx: string;
  expiryDate: string;
}

interface WarehouseProduct {
  id: number;
  ombor: number;
  ombor_name: string;
  mahsulot: number;
  mahsulot_name: string;
  soni: number;
}

interface Manager {
  id: number;
  username: string;
  user_type?: string;
}

export default function WarehousePage() {
  const { token, user } = useAuthStore();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [birliklar, setBirliklar] = useState<Birlik[]>([]);
  const [kategoriyalar, setKategoriyalar] = useState<Kategoriya[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [warehouseProducts, setWarehouseProducts] = useState<WarehouseProduct[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [productEntries, setProductEntries] = useState<ProductEntry[]>([{ product: '', quantity: '', narx: '', expiryDate: '' }]);
  const [selectedManager, setSelectedManager] = useState('');
  const [date, setDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditPurchaseModalOpen, setIsEditPurchaseModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isViewProductsModalOpen, setIsViewProductsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [selectedWarehouseProducts, setSelectedWarehouseProducts] = useState<WarehouseProduct[]>([]);
  const [newWarehouse, setNewWarehouse] = useState({ name: '', address: '', current_stock: '', responsible_person: '' });
  const [newProduct, setNewProduct] = useState({ name: '', sku: '', narx: '', birlik: '', kategoriya: '' });
  const [newSupplier, setNewSupplier] = useState({ username: '', email: '', password: '', phone_number: '', address: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [productSearchQueries, setProductSearchQueries] = useState<string[]>([]);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null); // Yangi state qo'shildi

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

  useEffect(() => {
    const fetchData = async () => {
      if (!token || !user) {
        setError('Autentifikatsiya tokeni yoki foydalanuvchi topilmadi.');
        setLoading(false);
        return;
      }

      try {
        const config = { headers: { Authorization: `JWT ${token}` } };
        const baseUrl = 'https://lemoonapi.cdpos.uz:444';

        const [warehousesRes, productsRes, birliklarRes, kategoriyalarRes, usersRes, purchasesRes, warehouseProductsRes] = await Promise.all([
          axios.get(`${baseUrl}/omborlar/`, config),
          fetchAllProducts(`${baseUrl}/mahsulotlar/`, config),
          axios.get(`${baseUrl}/birliklar/`, config),
          axios.get(`${baseUrl}/kategoriyalar/`, config),
          axios.get(`${baseUrl}/users/`, config),
          axios.get(`${baseUrl}/purchases/`, config),
          axios.get(`${baseUrl}/ombor_mahsulot/`, config),
        ]);

        let warehousesData = Array.isArray(warehousesRes.data) ? warehousesRes.data : warehousesRes.data.results || [];
        if (user.role === 'dealer' || user.role === 'shop') {
          warehousesData = warehousesData.filter((w: Warehouse) => w.responsible_person === user.id);
        }
        setWarehouses(warehousesData);

        setProducts(productsRes);

        setBirliklar(Array.isArray(birliklarRes.data) ? birliklarRes.data : birliklarRes.data.results || []);
        setKategoriyalar(Array.isArray(kategoriyalarRes.data) ? kategoriyalarRes.data : kategoriyalarRes.data.results || []);
        setManagers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.results || []);

        let purchasesData = Array.isArray(purchasesRes.data) ? purchasesRes.data : purchasesRes.data.results || [];
        if (user.role === 'dealer' || user.role === 'shop') {
          purchasesData = purchasesData.filter((p: Purchase) => warehousesData.some((w: Warehouse) => w.id === p.ombor));
        }
        setPurchases(purchasesData);

        let warehouseProductsData = Array.isArray(warehouseProductsRes.data) ? warehouseProductsRes.data : warehouseProductsRes.data.results || [];
        if (user.role === 'dealer' || user.role === 'shop') {
          warehouseProductsData = warehouseProductsData.filter((wp: WarehouseProduct) => warehousesData.some((w: Warehouse) => w.id === wp.ombor));
        }
        setWarehouseProducts(warehouseProductsData);

        setProductSearchQueries(productEntries.map(() => ''));
      } catch (err) {
        setError('Ma\'lumotlarni yuklashda xatolik yuz berdi');
        console.error('Fetch Data Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, user]);

  const getManagerName = (id: number | null) => {
    if (!id) return 'Belgilanmagan';
    const manager = managers.find((m) => m.id === id);
    return manager ? manager.username : 'Noma\'lum';
  };

  const getWarehouseName = (id: number) => {
    const warehouse = warehouses.find((w) => w.id === id);
    return warehouse ? warehouse.name : 'Noma\'lum ombor';
  };

  const getProductName = (productId: number) => {
    const product = products.find((p) => p.id === productId);
    return product ? product.name : 'Noma\'lum mahsulot';
  };

  const handleAddProductEntry = () => {
    setProductEntries([...productEntries, { product: '', quantity: '', narx: '', expiryDate: '' }]);
    setProductSearchQueries([...productSearchQueries, '']);
  };

  const handleRemoveProductEntry = (index: number) => {
    if (productEntries.length > 1) {
      setProductEntries(productEntries.filter((_, i) => i !== index));
      setProductSearchQueries(productSearchQueries.filter((_, i) => i !== index));
    }
  };

  const handleProductEntryChange = (index: number, field: keyof ProductEntry, value: string) => {
    const newProductEntries = [...productEntries];
    if (field === 'product') {
      const selectedProduct = products.find(p => p.name.toLowerCase() === value.toLowerCase());
      newProductEntries[index].product = value;
      newProductEntries[index].narx = selectedProduct ? selectedProduct.narx.toString() : '';
    } else {
      newProductEntries[index][field] = value;
    }
    setProductEntries(newProductEntries);
  };

  const handleProductSearchChange = (index: number, value: string) => {
    const newSearchQueries = [...productSearchQueries];
    newSearchQueries[index] = value;
    setProductSearchQueries(newSearchQueries);
  };

  const isFormValid = () => {
    return (
      selectedWarehouse &&
      selectedManager &&
      date &&
      productEntries.every(entry => entry.product && entry.quantity && entry.narx)
    );
  };

  const handleAddPurchase = async () => {
    if (!isFormValid()) {
      setNotification('Barcha majburiy maydonlarni to‘ldiring!');
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
      const config = { headers: { Authorization: `JWT ${token}` } };
      const warehouseId = warehouses.find(w => w.name === selectedWarehouse)?.id;
      const managerId = managers.find(m => m.username === selectedManager)?.id;

      if (!warehouseId || !managerId) {
        setError('Ombor yoki yetkazib beruvchi topilmadi');
        return;
      }

      const purchaseData = {
        ombor: warehouseId,
        sana: date,
        yetkazib_beruvchi: managerId,
        items: productEntries.map(entry => {
          const product = products.find(p => p.name === entry.product);
          if (!product) throw new Error(`Mahsulot "${entry.product}" topilmadi`);
          return {
            mahsulot: product.id,
            soni: parseInt(entry.quantity) || 0,
            narx: parseFloat(entry.narx).toFixed(2),
            yaroqlilik_muddati: entry.expiryDate || null,
          };
        }),
      };

      const response = await axios.post('https://lemoonapi.cdpos.uz:444/purchases/', purchaseData, config);
      setPurchases([...purchases, response.data]);

      const warehouseProductsRes = await axios.get('https://lemoonapi.cdpos.uz:444/ombor_mahsulot/', config);
      let warehouseProductsData = Array.isArray(warehouseProductsRes.data) ? warehouseProductsRes.data : warehouseProductsRes.data.results || [];
      if (user.role === 'dealer' || user.role === 'shop') {
        warehouseProductsData = warehouseProductsData.filter((wp: WarehouseProduct) => warehouses.some((w: Warehouse) => w.id === wp.ombor));
      }
      setWarehouseProducts(warehouseProductsData);

      setSelectedWarehouse('');
      setProductEntries([{ product: '', quantity: '', narx: '', expiryDate: '' }]);
      setProductSearchQueries(['']);
      setSelectedManager('');
      setDate('');
      setNotification('Buyurtma muvaffaqiyatli qo‘shildi!');
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Mahsulotlarni qo‘shishda xatolik');
      console.error('Add Purchase Error:', err.response?.data || err.message);
    }
  };

  const handleEditPurchase = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setSelectedWarehouse(getWarehouseName(purchase.ombor));
    setSelectedManager(getManagerName(purchase.yetkazib_beruvchi));
    setDate(purchase.sana);
    setProductEntries(purchase.items.map(item => ({
      product: getProductName(item.mahsulot),
      quantity: item.soni.toString(),
      narx: item.narx.toString(),
      expiryDate: item.yaroqlilik_muddati || '',
    })));
    setProductSearchQueries(purchase.items.map(() => ''));
    setIsEditPurchaseModalOpen(true);
  };

  const handleUpdatePurchase = async () => {
    if (!editingPurchase || !isFormValid()) {
      setNotification('Barcha majburiy maydonlarni to‘ldiring!');
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
      const config = { headers: { Authorization: `JWT ${token}` } };
      const warehouseId = warehouses.find(w => w.name === selectedWarehouse)?.id;
      const managerId = managers.find(m => m.username === selectedManager)?.id;

      if (!warehouseId || !managerId) {
        setError('Ombor yoki yetkazib beruvchi topilmadi');
        return;
      }

      const purchaseData = {
        ombor: warehouseId,
        sana: date,
        yetkazib_beruvchi: managerId,
        items: productEntries.map(entry => {
          const product = products.find(p => p.name === entry.product);
          if (!product) throw new Error(`Mahsulot "${entry.product}" topilmadi`);
          return {
            mahsulot: product.id,
            soni: parseInt(entry.quantity) || 0,
            narx: parseFloat(entry.narx).toFixed(2),
            yaroqlilik_muddati: entry.expiryDate || null,
          };
        }),
      };

      const response = await axios.put(`https://lemoonapi.cdpos.uz:444/purchases/${editingPurchase.id}/`, purchaseData, config);
      setPurchases(purchases.map(p => (p.id === editingPurchase.id ? response.data : p)));

      const warehouseProductsRes = await axios.get('https://lemoonapi.cdpos.uz:444/ombor_mahsulot/', config);
      let warehouseProductsData = Array.isArray(warehouseProductsRes.data) ? warehouseProductsRes.data : warehouseProductsRes.data.results || [];
      if (user.role === 'dealer' || user.role === 'shop') {
        warehouseProductsData = warehouseProductsData.filter((wp: WarehouseProduct) => warehouses.some((w: Warehouse) => w.id === wp.ombor));
      }
      setWarehouseProducts(warehouseProductsData);

      setIsEditPurchaseModalOpen(false);
      setSelectedWarehouse('');
      setProductEntries([{ product: '', quantity: '', narx: '', expiryDate: '' }]);
      setProductSearchQueries(['']);
      setSelectedManager('');
      setDate('');
      setEditingPurchase(null);
      setNotification('Buyurtma muvaffaqiyatli yangilandi!');
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Buyurtmani yangilashda xatolik');
      console.error('Update Purchase Error:', err.response?.data || err.message);
    }
  };

  const handleDeletePurchase = async (id: number) => {
    if (!id) {
      setError('O‘chirish uchun buyurtma ID topilmadi');
      console.error('Delete Purchase Error: ID is missing');
      return;
    }

    if (window.confirm('Ushbu buyurtmani o‘chirishni xohlaysizmi?')) {
      try {
        const config = { headers: { Authorization: `JWT ${token}` } };
        await axios.delete(`https://lemoonapi.cdpos.uz:444/purchases/${id}/`, config);
        setPurchases(purchases.filter(p => p.id !== id));

        const warehouseProductsRes = await axios.get('https://lemoonapi.cdpos.uz:444/ombor_mahsulot/', config);
        let warehouseProductsData = Array.isArray(warehouseProductsRes.data) ? warehouseProductsRes.data : warehouseProductsRes.data.results || [];
        if (user.role === 'dealer' || user.role === 'shop') {
          warehouseProductsData = warehouseProductsData.filter((wp: WarehouseProduct) => warehouses.some((w: Warehouse) => w.id === wp.ombor));
        }
        setWarehouseProducts(warehouseProductsData);

        setNotification('Buyurtma muvaffaqiyatli o‘chirildi!');
        setTimeout(() => setNotification(null), 3000);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Buyurtmani o‘chirishda xatolik');
        console.error('Delete Purchase Error:', err.response?.data || err.message);
      }
    }
  };

  const handleAddWarehouse = async () => {
    try {
      const config = { headers: { Authorization: `JWT ${token}` } };
      const warehouseData = {
        name: newWarehouse.name,
        address: newWarehouse.address,
        current_stock: parseInt(newWarehouse.current_stock) || 0,
        responsible_person: managers.find(m => m.username === newWarehouse.responsible_person)?.id || null,
      };

      const response = await axios.post('https://lemoonapi.cdpos.uz:444/omborlar/', warehouseData, config);
      setWarehouses([...warehouses, response.data]);
      setIsModalOpen(false);
      setNewWarehouse({ name: '', address: '', current_stock: '', responsible_person: '' });
      setNotification('Ombor muvaffaqiyatli qo‘shildi!');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      setError('Ombor qo‘shishda xatolik');
      console.error('Add Warehouse Error:', err);
    }
  };

  const handleEditWarehouse = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setIsEditModalOpen(true);
  };

  const handleUpdateWarehouse = async () => {
    if (!editingWarehouse) return;

    try {
      const config = { headers: { Authorization: `JWT ${token}` } };
      const updatedData = {
        name: editingWarehouse.name,
        address: editingWarehouse.address,
        current_stock: editingWarehouse.current_stock,
        responsible_person: editingWarehouse.responsible_person || null,
      };

      const response = await axios.put(`https://lemoonapi.cdpos.uz:444/omborlar/${editingWarehouse.id}/`, updatedData, config);
      setWarehouses(warehouses.map(w => (w.id === editingWarehouse.id ? response.data : w)));
      setIsEditModalOpen(false);
      setEditingWarehouse(null);
      setNotification('Ombor muvaffaqiyatli yangilandi!');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      setError('Ombor yangilashda xatolik');
      console.error('Update Warehouse Error:', err);
    }
  };

  const handleDeleteWarehouse = async (id: number) => {
    if (window.confirm('Ushbu omborni o‘chirishni xohlaysizmi?')) {
      try {
        const config = { headers: { Authorization: `JWT ${token}` } };
        await axios.delete(`https://lemoonapi.cdpos.uz:444/omborlar/${id}/`, config);
        setWarehouses(warehouses.filter(w => w.id !== id));
        setNotification('Ombor muvaffaqiyatli o‘chirildi!');
        setTimeout(() => setNotification(null), 3000);
      } catch (err) {
        setError('Ombor o‘chirishda xatolik');
        console.error('Delete Warehouse Error:', err);
      }
    }
  };

  const handleAddNewProduct = async () => {
    try {
      const config = { headers: { Authorization: `JWT ${token}` } };
      const newProductData = {
        name: newProduct.name,
        sku: newProduct.sku,
        narx: parseFloat(newProduct.narx).toFixed(2),
        birlik: newProduct.birlik ? parseInt(newProduct.birlik) : null,
        kategoriya: newProduct.kategoriya ? parseInt(newProduct.kategoriya) : null,
      };

      const response = await axios.post('https://lemoonapi.cdpos.uz:444/mahsulotlar/', newProductData, config);
      setProducts([...products, response.data]);
      setProductEntries([{ product: response.data.name, quantity: '', narx: response.data.narx.toString(), expiryDate: '' }]);
      setProductSearchQueries(['']);
      setIsAddProductModalOpen(false);
      setNewProduct({ name: '', sku: '', narx: '', birlik: '', kategoriya: '' });
      setNotification('Yangi mahsulot muvaffaqiyatli qo‘shildi!');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      setError('Yangi mahsulot qo‘shishda xatolik');
      console.error('Add Product Error:', err);
    }
  };

  const handleAddSupplier = async () => {
    try {
      const config = { headers: { Authorization: `JWT ${token}` } };
      const supplierData = {
        ...newSupplier,
        user_type: 'yetkazib_beruvchi',
      };

      const response = await axios.post('https://lemoonapi.cdpos.uz:444/users/', supplierData, config);
      setManagers([...managers, response.data]);
      setIsAddSupplierModalOpen(false);
      setNewSupplier({ username: '', email: '', password: '', phone_number: '', address: '' });
      setNotification('Yetkazib beruvchi muvaffaqiyatli qo‘shildi!');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      setError('Yetkazib beruvchi qo‘shishda xatolik yuz berdi');
      console.error('Add Supplier Error:', err);
    }
  };

  const handleViewProducts = (warehouseId: number) => {
    const products = warehouseProducts.filter((wp) => wp.ombor === warehouseId);
    setSelectedWarehouseProducts(products);
    setIsViewProductsModalOpen(true);
  };

  const handleViewPurchaseItems = (purchase: Purchase) => {
    setSelectedPurchase(purchase); // Tranzaksiyaning barcha mahsulotlarini saqlash
    setIsViewProductsModalOpen(true);
  };

  const renderProductSearch = (index: number) => (
    <div className="relative" key={`product-search-${index}`}>
      <label className="block text-sm font-medium text-gray-700">Mahsulot tanlash</label>
      <input
        type="text"
        value={productSearchQueries[index] || ''}
        onChange={(e) => handleProductSearchChange(index, e.target.value)}
        placeholder="Mahsulot nomini kiriting"
        className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      />
      {productSearchQueries[index] && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {products
            .filter(p => p.name.toLowerCase().includes(productSearchQueries[index].toLowerCase()))
            .map((product) => (
              <div
                key={product.id}
                className="p-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  handleProductEntryChange(index, 'product', product.name);
                  handleProductSearchChange(index, '');
                }}
              >
                {product.name} (Narx: {product.narx} UZS)
              </div>
            ))}
        </div>
      )}
      {productEntries[index].product && (
        <div className="mt-1 text-sm text-gray-600">Tanlangan: {productEntries[index].product}</div>
      )}
    </div>
  );

  if (loading) return <div className="p-6">Yuklanmoqda...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      {notification && (
        <div className="fixed top-4 right-4 bg-green-500 text-white p-4 rounded-md shadow-lg">
          {notification}
        </div>
      )}

      {(user?.role === 'admin' || user?.role === 'omborchi') && (
        <>
          <div className="mb-6 flex items-center justify-between">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Omborlarni qidirish..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Warehouse className="h-5 w-5 mr-2" />
              Ombor qo‘shish
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Ombor tanlash</label>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Ombor tanlang</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.name}>{warehouse.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Yetkazib beruvchi tanlash</label>
              <div className="flex items-center space-x-2">
                <select
                  value={selectedManager}
                  onChange={(e) => setSelectedManager(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Yetkazib beruvchi tanlang</option>
                  {managers
                    .filter((manager) => manager.user_type === 'yetkazib_beruvchi')
                    .map((manager) => (
                      <option key={manager.id} value={manager.username}>{manager.username}</option>
                    ))}
                </select>
                <button
                  onClick={() => setIsAddSupplierModalOpen(true)}
                  className="mt-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Sana</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Mahsulot qo‘shish</h3>
              <button
                onClick={() => setIsAddProductModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                Yangi mahsulot qo‘shish
              </button>
            </div>
            {productEntries.map((entry, index) => (
              <div key={`product-entry-${index}`} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 mb-4 items-end">
                {renderProductSearch(index)}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Miqdor</label>
                  <input
                    type="number"
                    value={entry.quantity}
                    onChange={(e) => handleProductEntryChange(index, 'quantity', e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Narx</label>
                  <input
                    type="text"
                    value={entry.narx}
                    readOnly
                    className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-gray-100 rounded-md focus:outline-none sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Yaroqlilik muddati</label>
                  <input
                    type="date"
                    value={entry.expiryDate}
                    onChange={(e) => handleProductEntryChange(index, 'expiryDate', e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <button
                    onClick={() => handleRemoveProductEntry(index)}
                    className="px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                    disabled={productEntries.length === 1}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={handleAddProductEntry}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Forma qo‘shish
            </button>
          </div>

          <button
            onClick={handleAddPurchase}
            disabled={!isFormValid()}
            className={`mt-4 px-4 py-2 rounded-md text-white ${isFormValid() ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
          >
            Mahsulotlarni qo‘shish
          </button>
        </>
      )}

      <div className="bg-white rounded-lg shadow-sm mb-6 mt-6">
        <div className="p-6">
          <h2 className="text-lg font-medium mb-4">Omborlar</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ombor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manzil</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Boshqaruvchi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mahsulotlar</th>
                  {(user?.role === 'admin' || user?.role === 'omborchi') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amallar</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {warehouses.length > 0 ? (
                  warehouses.map((warehouse) => (
                    <tr key={warehouse.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{warehouse.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{warehouse.address || 'Manzil kiritilmagan'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getManagerName(warehouse.responsible_person)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleViewProducts(warehouse.id)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-1" /> Mahsulotlarni ko‘rish
                        </button>
                      </td>
                      {(user?.role === 'admin' || user?.role === 'omborchi') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button onClick={() => handleEditWarehouse(warehouse)} className="text-blue-600 hover:text-blue-900 mr-2">
                            <Edit className="h-4 w-4 inline" /> Tahrirlash
                          </button>
                          <button onClick={() => handleDeleteWarehouse(warehouse.id)} className="text-red-600 hover:text-red-900">
                            <Trash2 className="h-4 w-4 inline" /> O‘chirish
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr key="no-warehouses">
                    <td colSpan={user?.role === 'admin' || user?.role === 'omborchi' ? 5 : 4} className="px-6 py-4 text-center text-gray-500">
                      Omborlar mavjud emas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm mt-6">
        <div className="p-6">
          <h2 className="text-lg font-medium mb-4">Tranzaksiyalar</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ombor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yetkazib beruvchi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sana</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mahsulotlar</th>
                  {(user?.role === 'admin' || user?.role === 'omborchi') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amallar</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchases.length > 0 ? (
                  purchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{getWarehouseName(purchase.ombor)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getManagerName(purchase.yetkazib_beruvchi)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{purchase.sana}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleViewPurchaseItems(purchase)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-1" /> Mahsulotlarni ko‘rish
                        </button>
                      </td>
                      {(user?.role === 'admin' || user?.role === 'omborchi') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button onClick={() => handleEditPurchase(purchase)} className="text-blue-600 hover:text-blue-900 mr-2">
                            <Edit className="h-4 w-4 inline" /> Tahrirlash
                          </button>
                          <button onClick={() => handleDeletePurchase(purchase.id)} className="text-red-600 hover:text-red-900">
                            <Trash2 className="h-4 w-4 inline" /> O‘chirish
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr key="no-purchases">
                    <td colSpan={user?.role === 'admin' || user?.role === 'omborchi' ? 5 : 4} className="px-6 py-4 text-center text-gray-500">
                      Tranzaksiyalar mavjud emas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-medium mb-4">Yangi ombor qo‘shish</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Ombor nomi</label>
                <input
                  type="text"
                  value={newWarehouse.name}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Manzil</label>
                <input
                  type="text"
                  value={newWarehouse.address}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, address: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Joriy zaxira</label>
                <input
                  type="number"
                  value={newWarehouse.current_stock}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, current_stock: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Boshqaruvchi</label>
                <select
                  value={newWarehouse.responsible_person}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, responsible_person: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Boshqaruvchi tanlang</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.username}>{manager.username}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleAddWarehouse}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Ombor qo‘shish
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && editingWarehouse && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-medium mb-4">Ombor tahrirlash</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Ombor nomi</label>
                <input
                  type="text"
                  value={editingWarehouse.name}
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, name: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Manzil</label>
                <input
                  type="text"
                  value={editingWarehouse.address}
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, address: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Joriy zaxira</label>
                <input
                  type="number"
                  value={editingWarehouse.current_stock}
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, current_stock: Number(e.target.value) })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Boshqaruvchi</label>
                <select
                  value={getManagerName(editingWarehouse.responsible_person)}
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, responsible_person: managers.find(m => m.username === e.target.value)?.id || null })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Boshqaruvchi tanlang</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.username}>{manager.username}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleUpdateWarehouse}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Ombor yangilash
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditPurchaseModalOpen && editingPurchase && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[80%] max-w-4xl">
            <h2 className="text-lg font-medium mb-4">Buyurtmani tahrirlash</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Ombor tanlash</label>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Ombor tanlang</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.name}>{warehouse.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Yetkazib beruvchi tanlash</label>
                <div className="flex items-center space-x-2">
                  <select
                    value={selectedManager}
                    onChange={(e) => setSelectedManager(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Yetkazib beruvchi tanlang</option>
                    {managers
                      .filter((manager) => manager.user_type === 'yetkazib_beruvchi')
                      .map((manager) => (
                        <option key={manager.id} value={manager.username}>{manager.username}</option>
                      ))}
                  </select>
                  <button
                    onClick={() => setIsAddSupplierModalOpen(true)}
                    className="mt-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Sana</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Mahsulotlar</h3>
              {productEntries.map((entry, index) => (
                <div key={`edit-product-entry-${index}`} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 mb-4 items-end">
                  {renderProductSearch(index)}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Miqdor</label>
                    <input
                      type="number"
                      value={entry.quantity}
                      onChange={(e) => handleProductEntryChange(index, 'quantity', e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Narx</label>
                    <input
                      type="text"
                      value={entry.narx}
                      readOnly
                      className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-gray-100 rounded-md focus:outline-none sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Yaroqlilik muddati</label>
                    <input
                      type="date"
                      value={entry.expiryDate}
                      onChange={(e) => handleProductEntryChange(index, 'expiryDate', e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <button
                      onClick={() => handleRemoveProductEntry(index)}
                      className="px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                      disabled={productEntries.length === 1}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={handleAddProductEntry}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                Forma qo‘shish
              </button>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setIsEditPurchaseModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleUpdatePurchase}
                disabled={!isFormValid()}
                className={`px-4 py-2 rounded-md text-white ${isFormValid() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
              >
                Buyurtmani yangilash
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddProductModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-medium mb-4">Yangi mahsulot qo‘shish</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nomi</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">SKU</label>
                <input
                  type="text"
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Narx</label>
                <input
                  type="number"
                  value={newProduct.narx}
                  onChange={(e) => setNewProduct({ ...newProduct, narx: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Birlik</label>
                <select
                  value={newProduct.birlik}
                  onChange={(e) => setNewProduct({ ...newProduct, birlik: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Birlik tanlang</option>
                  {birliklar.map((birlik) => (
                    <option key={birlik.id} value={birlik.id}>{birlik.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Kategoriya</label>
                <select
                  value={newProduct.kategoriya}
                  onChange={(e) => setNewProduct({ ...newProduct, kategoriya: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Kategoriya tanlang</option>
                  {kategoriyalar.map((kategoriya) => (
                    <option key={kategoriya.id} value={kategoriya.id}>{kategoriya.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setIsAddProductModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleAddNewProduct}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Mahsulot qo‘shish
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddSupplierModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-medium mb-4">Yangi yetkazib beruvchi qo‘shish</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Foydalanuvchi nomi</label>
                <input
                  type="text"
                  value={newSupplier.username}
                  onChange={(e) => setNewSupplier({ ...newSupplier, username: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Parol</label>
                <input
                  type="password"
                  value={newSupplier.password}
                  onChange={(e) => setNewSupplier({ ...newSupplier, password: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Telefon raqami</label>
                <input
                  type="text"
                  value={newSupplier.phone_number}
                  onChange={(e) => setNewSupplier({ ...newSupplier, phone_number: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Manzil</label>
                <input
                  type="text"
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setIsAddSupplierModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleAddSupplier}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Yetkazib beruvchi qo‘shish
              </button>
            </div>
          </div>
        </div>
      )}

      {isViewProductsModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[80%] max-w-3xl">
            <h2 className="text-lg font-medium mb-4">
              {selectedPurchase ? `Tranzaksiya mahsulotlari: ${getWarehouseName(selectedPurchase.ombor)} - ${selectedPurchase.sana}` : 'Ombordagi Mahsulotlar'}
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mahsulot Nomi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Narx</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Miqdori</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yaroqlilik muddati</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedPurchase ? (
                    selectedPurchase.items.map((item, index) => (
                      <tr key={item.id || `item-${selectedPurchase.id}-${index}`}>
                        <td className="px-6 py-4 whitespace-nowrap">{getProductName(item.mahsulot)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{parseFloat(item.narx).toLocaleString()} UZS</td>
                        <td className="px-6 py-4 whitespace-nowrap">{item.soni} dona</td>
                        <td className="px-6 py-4 whitespace-nowrap">{item.yaroqlilik_muddati || 'Belgilanmagan'}</td>
                      </tr>
                    ))
                  ) : selectedWarehouseProducts.length > 0 ? (
                    selectedWarehouseProducts.map((wp) => (
                      <tr key={wp.id}>
                        <td className="px-6 py-4 whitespace-nowrap">{wp.mahsulot_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {products.find(p => p.id === wp.mahsulot)?.narx.toLocaleString() || 'Noma’lum'} UZS
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{wp.soni} dona</td>
                        <td className="px-6 py-4 whitespace-nowrap">N/A</td>
                      </tr>
                    ))
                  ) : (
                    <tr key="no-products">
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                        Mahsulotlar mavjud emas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setIsViewProductsModalOpen(false);
                  setSelectedPurchase(null);
                }}
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