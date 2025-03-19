import React, { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

interface Product {
  id: number;
  name: string;
  sku: string;
  birlik: number | { id: number; name: string } | null;
  kategoriya: number | { id: number; name: string } | null;
  narx: string;
  rasm: string | null;
}

interface Unit {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
}

const BASE_URL = 'https://lemoonapi.cdpos.uz:444/';

const ProductsPage: React.FC = () => {
  const { token, user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    narx: '',
    birlik: '',
    kategoriya: '',
    rasm: null as File | null,
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [newUnit, setNewUnit] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 9;

  const apiConfig = {
    headers: { Authorization: `JWT ${token}` },
  };

  const getImageUrl = (rasm: string | null) => {
    if (!rasm) return '/placeholder-image.jpg';
    return rasm.startsWith('http') ? rasm : `${BASE_URL}${rasm}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!token || !user) {
        setError('Autentifikatsiya tokeni yoki foydalanuvchi topilmadi.');
        setLoading(false);
        return;
      }

      if (user.role !== 'admin' && user.role !== 'omborchi') {
        setError('Bu sahifaga faqat admin va omborchi kirishi mumkin.');
        setLoading(false);
        return;
      }

      try {
        console.log('So‘rov yuborilmoqda:', `${BASE_URL}mahsulotlar/?limit=1000`);
        const productsRes = await axios.get(`${BASE_URL}mahsulotlar/?limit=1000`, apiConfig);
        console.log('Products Response:', JSON.stringify(productsRes.data, null, 2));
        let productsData = Array.isArray(productsRes.data.results) ? productsRes.data.results : productsRes.data;

        if (productsRes.data.next) {
          let allProducts: Product[] = [...productsData];
          let nextUrl = productsRes.data.next;
          console.log('Backend’dan kelgan next URL:', nextUrl);

          while (nextUrl) {
            let correctedNextUrl = nextUrl; // Har safar yangi qiymat olish uchun let ishlatamiz
            const urlObj = new URL(nextUrl);
            correctedNextUrl = `${BASE_URL}mahsulotlar/${urlObj.search}`;
            console.log('To‘g‘rilangan next URL:', correctedNextUrl);

            console.log('Keyingi sahifaga so‘rov:', correctedNextUrl);
            const nextRes = await axios.get(correctedNextUrl, apiConfig);
            const nextData = Array.isArray(nextRes.data.results) ? nextRes.data.results : nextRes.data;
            allProducts = [...allProducts, ...nextData];
            nextUrl = nextRes.data.next;
          }
          productsData = allProducts;
        }

        productsData.sort((a: Product, b: Product) => a.name.localeCompare(b.name));
        setProducts(productsData);

        console.log('Birliklar uchun so‘rov:', `${BASE_URL}birliklar/`);
        const unitsRes = await axios.get(`${BASE_URL}birliklar/`, apiConfig);
        const unitsData = Array.isArray(unitsRes.data.results) ? unitsRes.data.results : unitsRes.data;
        setUnits(unitsData);

        console.log('Kategoriyalar uchun so‘rov:', `${BASE_URL}kategoriyalar/`);
        const categoriesRes = await axios.get(`${BASE_URL}kategoriyalar/`, apiConfig);
        const categoriesData = Array.isArray(categoriesRes.data.results) ? categoriesRes.data.results : categoriesRes.data;
        setCategories(categoriesData);

      } catch (err: any) {
        console.error('Error fetching data:', err.message);
        if (err.response) {
          setError(err.response.data?.detail || 'Serverda xatolik yuz berdi');
          console.log('Server javobi:', err.response.data);
        } else if (err.request) {
          setError('Server bilan aloqa qilishda xatolik: Server ishlamayotgan bo‘lishi mumkin');
          console.log('So‘rov muvaffaqiyatsiz:', err.request);
        } else {
          setError('Xatolik yuz berdi: ' + err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, user]);

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.sku || !newProduct.narx || !newProduct.birlik || !newProduct.kategoriya) {
      setError('Barcha maydonlar (nomi, SKU, narx, birlik, kategoriya) to‘ldirilishi shart');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', newProduct.name);
      formData.append('sku', newProduct.sku);
      formData.append('narx', newProduct.narx);
      formData.append('birlik', newProduct.birlik);
      formData.append('kategoriya', newProduct.kategoriya);
      if (newProduct.rasm) formData.append('rasm', newProduct.rasm);

      console.log('Yuborilayotgan formData:', [...formData]);
      const response = await axios.post(`${BASE_URL}mahsulotlar/`, formData, {
        headers: {
          ...apiConfig.headers,
          'Content-Type': 'multipart/form-data',
        },
      });
      setProducts([...products, response.data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewProduct({ name: '', sku: '', narx: '', birlik: '', kategoriya: '', rasm: null });
      setPreviewImage(null);
      setError(null);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Error adding product:', err.response?.data || err.message);
      const errorDetail = err.response?.data?.name?.[0] || err.response?.data?.narx?.[0] || 'Mahsulot qo‘shishda xatolik yuz berdi';
      setError(errorDetail);
    }
  };

  const handleAddUnit = async () => {
    if (!newUnit.trim()) return;

    try {
      const response = await axios.post(`${BASE_URL}birliklar/`, { name: newUnit }, apiConfig);
      setUnits([...units, response.data]);
      setNewUnit('');
      setError(null);
    } catch (err: any) {
      console.error('Error adding unit:', err.response?.data || err.message);
      setError(err.response?.data?.detail || 'Birlik qo‘shishda xatolik yuz berdi');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      const response = await axios.post(`${BASE_URL}kategoriyalar/`, { name: newCategory }, apiConfig);
      setCategories([...categories, response.data]);
      setNewCategory('');
      setError(null);
    } catch (err: any) {
      console.error('Error adding category:', err.response?.data || err.message);
      setError(err.response?.data?.detail || 'Kategoriya qo‘shishda xatolik yuz berdi');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditProduct({
      ...product,
      birlik: typeof product.birlik === 'number' ? units.find(u => u.id === product.birlik) || null : product.birlik,
      kategoriya: typeof product.kategoriya === 'number' ? categories.find(c => c.id === product.kategoriya) || null : product.kategoriya,
    });
  };

  const handleUpdateProduct = async () => {
    if (!editProduct || !editProduct.name || !editProduct.sku || !editProduct.narx) {
      setError('Barcha majburiy maydonlar (nomi, SKU, narx) to‘ldirilishi shart');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', editProduct.name);
      formData.append('sku', editProduct.sku);
      formData.append('narx', editProduct.narx);
      const selectedBirlikId = newProduct.birlik || (editProduct.birlik && (typeof editProduct.birlik === 'number' ? editProduct.birlik : editProduct.birlik.id));
      const selectedKategoriyaId = newProduct.kategoriya || (editProduct.kategoriya && (typeof editProduct.kategoriya === 'number' ? editProduct.kategoriya : editProduct.kategoriya.id));
      if (selectedBirlikId) formData.append('birlik', selectedBirlikId.toString());
      if (selectedKategoriyaId) formData.append('kategoriya', selectedKategoriyaId.toString());
      if (newProduct.rasm) formData.append('rasm', newProduct.rasm);

      console.log('Yangilash uchun formData:', [...formData]);
      const response = await axios.put(`${BASE_URL}mahsulotlar/${editProduct.id}/`, formData, {
        headers: {
          ...apiConfig.headers,
          'Content-Type': 'multipart/form-data',
        },
      });
      setProducts(products.map(p => (p.id === editProduct.id ? response.data : p)).sort((a, b) => a.name.localeCompare(b.name)));
      setEditProduct(null);
      setPreviewImage(null);
      setError(null);
    } catch (err: any) {
      console.error('Error updating product:', err.response?.data || err.message);
      const errorDetail = err.response?.data?.name?.[0] || err.response?.data?.narx?.[0] || 'Mahsulot yangilashda xatolik yuz berdi';
      setError(errorDetail);
    }
  };

  const handleRemoveProduct = async (id: string) => {
    try {
      await axios.delete(`${BASE_URL}mahsulotlar/${id}/`, apiConfig);
      setProducts(products.filter(p => p.id !== parseInt(id)).sort((a, b) => a.name.localeCompare(b.name)));
      setError(null);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Error removing product:', err.response?.data || err.message);
      setError(err.response?.data?.detail || 'Mahsulot o‘chirishda xatolik yuz berdi');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    setNewProduct({ ...newProduct, rasm: file });
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewImage(null);
    }
  };

  const getBirlikName = (birlik: number | { id: number; name: string } | null) => {
    if (!birlik) return 'Belgilanmagan';
    const id = typeof birlik === 'number' ? birlik : birlik.id;
    const unit = units.find(u => u.id === id);
    return unit ? unit.name : 'Belgilanmagan';
  };

  const getKategoriyaName = (kategoriya: number | { id: number; name: string } | null) => {
    if (!kategoriya) return 'Belgilanmagan';
    const id = typeof kategoriya === 'number' ? kategoriya : kategoriya.id;
    const category = categories.find(c => c.id === id);
    return category ? category.name : 'Belgilanmagan';
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (loading) return <div className="p-6">Yuklanmoqda...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Mahsulotlar boshqaruvi</h1>

      {(user?.role === 'admin' || user?.role === 'omborchi') && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Yangi mahsulot qo‘shish</h2>
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Mahsulot nomi *</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="Nomini kiriting"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">SKU *</label>
                <input
                  type="text"
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="SKU kiriting"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Birlik *</label>
                <div className="flex gap-2">
                  <select
                    value={newProduct.birlik}
                    onChange={(e) => setNewProduct({ ...newProduct, birlik: e.target.value })}
                    className="flex-1 p-2 border rounded"
                    required
                  >
                    <option value="">Tanlang</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="Yangi"
                    className="w-24 p-2 border rounded"
                  />
                  <button
                    onClick={handleAddUnit}
                    className="bg-green-500 text-white px-3 rounded hover:bg-green-600"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Kategoriya *</label>
                <div className="flex gap-2">
                  <select
                    value={newProduct.kategoriya}
                    onChange={(e) => setNewProduct({ ...newProduct, kategoriya: e.target.value })}
                    className="flex-1 p-2 border rounded"
                    required
                  >
                    <option value="">Tanlang</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Yangi"
                    className="w-24 p-2 border rounded"
                  />
                  <button
                    onClick={handleAddCategory}
                    className="bg-green-500 text-white px-3 rounded hover:bg-green-600"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Narx *</label>
                <input
                  type="number"
                  value={newProduct.narx}
                  onChange={(e) => setNewProduct({ ...newProduct, narx: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="Narx kiriting"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Rasm</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full p-2 border rounded"
                />
                {previewImage && (
                  <img src={previewImage} alt="Preview" className="w-16 h-16 object-cover mt-2 rounded" />
                )}
              </div>
            </div>

            <button
              onClick={handleAddProduct}
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              Mahsulot qo‘shish
            </button>
          </div>
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Mahsulotlar ro‘yxati ({filteredProducts.length} ta)</h2>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nomi yoki SKU bo‘yicha qidirish"
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-64"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentProducts.map((product) => (
            <div key={product.id} className="border p-4 rounded-lg flex items-start">
              <div className="flex-shrink-0 mr-4">
                {product.rasm ? (
                  <img
                    src={getImageUrl(product.rasm)}
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded"
                    onError={(e) => {
                      console.log(`Rasm yuklanmadi: ${getImageUrl(product.rasm)}`);
                      e.currentTarget.src = '/placeholder-image.jpg';
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 flex items-center justify-center rounded text-gray-500">
                    Rasm yo‘q
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{product.name}</h3>
                <p>SKU: {product.sku}</p>
                <p>Kategoriya: {getKategoriyaName(product.kategoriya)}</p>
                <p>Birlik: {getBirlikName(product.birlik)}</p>
                <p>Narx: {product.narx} UZS</p>
                {(user?.role === 'admin' || user?.role === 'omborchi') && (
                  <div className="mt-2 space-x-2">
                    <button
                      onClick={() => handleRemoveProduct(product.id.toString())}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      O‘chirish
                    </button>
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                    >
                      Tahrirlash
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length > productsPerPage && (
          <div className="mt-6 flex justify-center items-center space-x-2">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded ${currentPage === 1 ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
            >
              Oldingi
            </button>
            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={index + 1}
                onClick={() => paginate(index + 1)}
                className={`px-4 py-2 rounded ${currentPage === index + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                {index + 1}
              </button>
            ))}
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded ${currentPage === totalPages ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
            >
              Keyingi
            </button>
          </div>
        )}
      </div>

      {editProduct && (user?.role === 'admin' || user?.role === 'omborchi') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Mahsulotni tahrirlash</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Mahsulot nomi</label>
                  <input
                    type="text"
                    value={editProduct.name}
                    onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">SKU</label>
                  <input
                    type="text"
                    value={editProduct.sku}
                    onChange={(e) => setEditProduct({ ...editProduct, sku: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Birlik</label>
                  <select
                    value={editProduct.birlik ? (typeof editProduct.birlik === 'number' ? editProduct.birlik : editProduct.birlik.id) : ''}
                    onChange={(e) => {
                      const selectedUnit = units.find(u => u.id === parseInt(e.target.value)) || null;
                      setEditProduct({ ...editProduct, birlik: selectedUnit });
                      setNewProduct({ ...newProduct, birlik: e.target.value });
                    }}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Tanlang</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Kategoriya</label>
                  <select
                    value={editProduct.kategoriya ? (typeof editProduct.kategoriya === 'number' ? editProduct.kategoriya : editProduct.kategoriya.id) : ''}
                    onChange={(e) => {
                      const selectedCategory = categories.find(c => c.id === parseInt(e.target.value)) || null;
                      setEditProduct({ ...editProduct, kategoriya: selectedCategory });
                      setNewProduct({ ...newProduct, kategoriya: e.target.value });
                    }}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Tanlang</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Narx</label>
                  <input
                    type="number"
                    value={editProduct.narx}
                    onChange={(e) => setEditProduct({ ...editProduct, narx: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Rasm</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full p-2 border rounded"
                  />
                  {(previewImage || editProduct.rasm) && (
                    <img
                      src={previewImage || getImageUrl(editProduct.rasm)}
                      alt={editProduct.name}
                      className="w-16 h-16 object-cover mt-2 rounded"
                      onError={(e) => {
                        console.log(`Rasm yuklanmadi: ${getImageUrl(editProduct.rasm)}`);
                        e.currentTarget.src = '/placeholder-image.jpg';
                      }}
                    />
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setEditProduct(null);
                    setPreviewImage(null);
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleUpdateProduct}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Saqlash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;