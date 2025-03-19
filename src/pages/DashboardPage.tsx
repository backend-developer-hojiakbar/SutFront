import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Package,
  Users,
  Store,
  FileText,
  TrendingUp,
  Undo2,
  ShoppingCart,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const BASE_URL = 'https://lemoonapi.cdpos.uz:444/';

// Interfeyslar (oldingi kod bilan bir xil)
interface Sale {
  id: number;
  sana: string;
  sotib_oluvchi: number;
  total_sum: string;
  ombor: number;
  items: { mahsulot: number; soni: number; narx: string }[];
}

interface User {
  id: number;
  username: string;
  user_type: string;
  created_by?: number;
}

interface Product {
  id: number;
  name: string;
}

interface Warehouse {
  id: number;
  name: string;
}

interface Purchase {
  id: number;
  ombor: number;
  sana: string;
  yetkazib_beruvchi: number;
  items: { mahsulot: number; soni: number; narx: string }[];
  total_sum: string;
}

interface Return {
  id: number;
  sana: string;
  qaytaruvchi: number;
  total_sum: string;
  ombor: number;
  items: { mahsulot: number; soni: number; narx: string }[];
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export default function DashboardPage() {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalDealers: 0,
    totalShops: 0,
    totalSales: 0,
    totalReturns: 0,
    totalPurchases: 0,
  });
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [returns, setReturns] = useState<Return[]>([]);
  const [filteredReturns, setFilteredReturns] = useState<Return[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [currentPageSales, setCurrentPageSales] = useState(1);
  const [currentPageReturns, setCurrentPageReturns] = useState(1);
  const [currentPagePurchases, setCurrentPagePurchases] = useState(1);
  const [salesFilter, setSalesFilter] = useState<'today' | 'yesterday' | 'last_7_days' | 'this_month' | 'this_year'>('today');
  const [returnsFilter, setReturnsFilter] = useState<'today' | 'yesterday' | 'last_7_days' | 'this_month' | 'this_year'>('today');
  const [purchasesFilter, setPurchasesFilter] = useState<'today' | 'yesterday' | 'last_7_days' | 'this_month' | 'this_year'>('today');
  const itemsPerPage = 5;

  const fetchPaginatedData = async (url: string): Promise<any[]> => {
    let allData: any[] = [];
    let nextUrl: string | null = url;
    const config = { headers: { Authorization: `JWT ${token}` } };

    try {
      while (nextUrl) {
        const response = await axios.get<PaginatedResponse<any>>(nextUrl, config);
        allData = [...allData, ...response.data.results];
        nextUrl = response.data.next;
      }
      return allData;
    } catch (error) {
      console.error('Error fetching paginated data:', error);
      setError('Ma\'lumotlarni yuklashda xatolik yuz berdi');
      return [];
    }
  };

  const fetchData = async () => {
    if (!token || !user) {
      setError('Autentifikatsiya tokeni yoki foydalanuvchi topilmadi.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const productsData = await fetchPaginatedData(`${BASE_URL}mahsulotlar/`);
      const totalProducts = productsData.length;
      setProducts(productsData);

      const usersData = await fetchPaginatedData(`${BASE_URL}users/`);
      setUsers(usersData);
      const totalDealers = user.role === 'admin' ? usersData.filter((u: any) => u.user_type === 'dealer').length : 0;
      const totalShops = user.role === 'dealer'
        ? usersData.filter((u: any) => u.user_type === 'shop' && u.created_by === user.id).length
        : user.role === 'admin'
        ? usersData.filter((u: any) => u.user_type === 'shop').length
        : 0;

      const salesData = await fetchPaginatedData(`${BASE_URL}sotuvlar/`);
      let filteredSalesData = [...salesData];
      if (user.role === 'dealer') {
        const dealerShops = usersData
          .filter((u: any) => u.user_type === 'shop' && u.created_by === user.id)
          .map((u: any) => u.id);
        filteredSalesData = filteredSalesData.filter((sale: Sale) => dealerShops.includes(sale.sotib_oluvchi));
      } else if (user.role === 'shop') {
        filteredSalesData = filteredSalesData.filter((sale: Sale) => sale.sotib_oluvchi === user.id);
      }
      filteredSalesData.sort((a: Sale, b: Sale) => new Date(b.sana).getTime() - new Date(a.sana).getTime());
      setSales(filteredSalesData);

      const returnsData = await fetchPaginatedData(`${BASE_URL}sotuv_qaytarish/`);
      let filteredReturnsData = [...returnsData];
      if (user.role === 'dealer' || user.role === 'shop') {
        filteredReturnsData = filteredReturnsData.filter((r: Return) => r.qaytaruvchi === user.id);
      }
      filteredReturnsData.sort((a: Return, b: Return) => new Date(b.sana).getTime() - new Date(a.sana).getTime());
      setReturns(filteredReturnsData);

      const warehousesData = await fetchPaginatedData(`${BASE_URL}omborlar/`);
      setWarehouses(warehousesData);

      const purchasesData = await fetchPaginatedData(`${BASE_URL}purchases/`);
      let filteredPurchasesData = [...purchasesData];
      if (user.role === 'dealer' || user.role === 'shop') {
        filteredPurchasesData = filteredPurchasesData.filter((p: Purchase) => p.yetkazib_beruvchi === user.id);
      }
      filteredPurchasesData.sort((a: Purchase, b: Purchase) => new Date(b.sana).getTime() - new Date(a.sana).getTime());
      setPurchases(filteredPurchasesData);
      setFilteredPurchases(filteredPurchasesData); // Dastlabki holatda barcha xaridlar ko‘rsatiladi

      setStats({
        totalProducts,
        totalDealers,
        totalShops,
        totalSales: 0,
        totalReturns: 0,
        totalPurchases: filteredPurchasesData.reduce((sum, purchase) => sum + parseFloat(purchase.total_sum || '0'), 0),
      });
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setError(error.response?.data?.detail || 'Ma\'lumotlarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token, user]);

  useEffect(() => {
    const fetchFilteredSales = async () => {
      try {
        const filteredSalesData = await fetchPaginatedData(`${BASE_URL}sotuvlar/?date_filter=${salesFilter}`);
        let result = [...filteredSalesData];
        if (user.role === 'dealer') {
          const dealerShops = users
            .filter((u: any) => u.user_type === 'shop' && u.created_by === user.id)
            .map((u: any) => u.id);
          result = result.filter((sale: Sale) => dealerShops.includes(sale.sotib_oluvchi));
        } else if (user.role === 'shop') {
          result = result.filter((sale: Sale) => sale.sotib_oluvchi === user.id);
        }
        setFilteredSales(result);

        const totalSales = result.reduce((sum: number, sale: Sale) => {
          return sum + parseFloat(sale.total_sum || '0');
        }, 0);

        setStats((prevStats) => ({
          ...prevStats,
          totalSales,
        }));
      } catch (error) {
        console.error('Error fetching filtered sales:', error);
        setError('Filtrlangan sotuvlarni yuklashda xatolik yuz berdi');
      }
    };

    if (token) fetchFilteredSales();
  }, [salesFilter, token, user, users]);

  useEffect(() => {
    const fetchFilteredReturns = async () => {
      try {
        const filteredReturnsData = await fetchPaginatedData(`${BASE_URL}sotuv_qaytarish/?date_filter=${returnsFilter}`);
        let result = [...filteredReturnsData];
        if (user.role === 'dealer' || user.role === 'shop') {
          result = result.filter((r: Return) => r.qaytaruvchi === user.id);
        }
        setFilteredReturns(result);

        const totalReturns = result.reduce((sum: number, returnItem: Return) => {
          return sum + parseFloat(returnItem.total_sum || '0');
        }, 0);

        setStats((prevStats) => ({
          ...prevStats,
          totalReturns,
        }));
      } catch (error) {
        console.error('Error fetching filtered returns:', error);
        setError('Filtrlangan qaytarishlarni yuklashda xatolik yuz berdi');
      }
    };

    if (token) fetchFilteredReturns();
  }, [returnsFilter, token, user]);

  // Frontendda sana bo‘yicha filtr
  useEffect(() => {
    const filterPurchasesByDate = () => {
      const now = new Date();
      let filtered = [...purchases];

      switch (purchasesFilter) {
        case 'today': {
          const today = new Date(now.setHours(0, 0, 0, 0));
          filtered = purchases.filter((p) => new Date(p.sana) >= today);
          break;
        }
        case 'yesterday': {
          const yesterday = new Date(now.setHours(0, 0, 0, 0));
          yesterday.setDate(yesterday.getDate() - 1);
          filtered = purchases.filter(
            (p) => new Date(p.sana) >= yesterday && new Date(p.sana) < new Date(now.setHours(0, 0, 0, 0))
          );
          break;
        }
        case 'last_7_days': {
          const last7Days = new Date(now.setHours(0, 0, 0, 0));
          last7Days.setDate(last7Days.getDate() - 7);
          filtered = purchases.filter((p) => new Date(p.sana) >= last7Days);
          break;
        }
        case 'this_month': {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          filtered = purchases.filter((p) => new Date(p.sana) >= startOfMonth);
          break;
        }
        case 'this_year': {
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          filtered = purchases.filter((p) => new Date(p.sana) >= startOfYear);
          break;
        }
        default:
          filtered = purchases;
      }

      setFilteredPurchases(filtered);
      const totalPurchases = filtered.reduce((sum, purchase) => sum + parseFloat(purchase.total_sum || '0'), 0);
      setStats((prevStats) => ({
        ...prevStats,
        totalPurchases,
      }));
    };

    filterPurchasesByDate();
  }, [purchasesFilter, purchases]);

  const formatToTashkentTime = (dateString: string | null) => {
    const date = dateString ? new Date(dateString) : new Date();
    const offsetMinutes = 5 * 60; // UTC+5
    const localOffsetMinutes = date.getTimezoneOffset();
    const tashkentTime = new Date(date.getTime() + (offsetMinutes + localOffsetMinutes) * 60 * 1000);
    return tashkentTime.toLocaleDateString('uz-UZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getUsername = (userId: number) => {
    const foundUser = users.find((u) => u.id === userId);
    return foundUser ? foundUser.username : `Foydalanuvchi #${userId}`;
  };

  const getProductName = (productId: number) => {
    const foundProduct = products.find((p) => p.id === productId);
    return foundProduct ? foundProduct.name : `Mahsulot #${productId}`;
  };

  const getSupplierName = (supplierId: number | undefined) => {
    if (supplierId === undefined || supplierId === null) return 'Noma’lum yetkazib beruvchi';
    const foundSupplier = users.find((u) => u.id === supplierId);
    return foundSupplier ? foundSupplier.username : `Noma’lum yetkazib beruvchi #${supplierId}`;
  };

  const getWarehouseName = (omborId: number) => {
    const foundWarehouse = warehouses.find((w) => w.id === omborId);
    return foundWarehouse ? foundWarehouse.name : `Noma’lum ombor #${omborId}`;
  };

  const handleSaleClick = (sale: Sale) => {
    setSelectedSale(sale);
    setIsSaleModalOpen(true);
  };

  const handlePurchaseClick = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setIsPurchaseModalOpen(true);
  };

  const handleReturnClick = (returnItem: Return) => {
    setSelectedReturn(returnItem);
    setIsReturnModalOpen(true);
  };

  const handleViewPurchases = () => {
    navigate('/warehouse');
  };

  const totalPagesSales = Math.ceil(sales.length / itemsPerPage);
  const paginatedSales = sales.slice((currentPageSales - 1) * itemsPerPage, currentPageSales * itemsPerPage);

  const handlePreviousPageSales = () => {
    if (currentPageSales > 1) setCurrentPageSales(currentPageSales - 1);
  };

  const handleNextPageSales = () => {
    if (currentPageSales < totalPagesSales) setCurrentPageSales(currentPageSales + 1);
  };

  const totalPagesReturns = Math.ceil(returns.length / itemsPerPage);
  const paginatedReturns = returns.slice((currentPageReturns - 1) * itemsPerPage, currentPageReturns * itemsPerPage);

  const handlePreviousPageReturns = () => {
    if (currentPageReturns > 1) setCurrentPageReturns(currentPageReturns - 1);
  };

  const handleNextPageReturns = () => {
    if (currentPageReturns < totalPagesReturns) setCurrentPageReturns(currentPageReturns + 1);
  };

  const totalPagesPurchases = Math.ceil(filteredPurchases.length / itemsPerPage);
  const paginatedPurchases = filteredPurchases.slice((currentPagePurchases - 1) * itemsPerPage, currentPagePurchases * itemsPerPage);

  const handlePreviousPagePurchases = () => {
    if (currentPagePurchases > 1) setCurrentPagePurchases(currentPagePurchases - 1);
  };

  const handleNextPagePurchases = () => {
    if (currentPagePurchases < totalPagesPurchases) setCurrentPagePurchases(currentPagePurchases + 1);
  };

  const handleSalesFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSalesFilter(e.target.value as 'today' | 'yesterday' | 'last_7_days' | 'this_month' | 'this_year');
  };

  const handleReturnsFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setReturnsFilter(e.target.value as 'today' | 'yesterday' | 'last_7_days' | 'this_month' | 'this_year');
  };

  const handlePurchasesFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPurchasesFilter(e.target.value as 'today' | 'yesterday' | 'last_7_days' | 'this_month' | 'this_year');
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-4 text-gray-600">Yuklanmoqda...</span>
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Xush kelibsiz, {user?.username}!</h1>
        <p className="text-gray-600">Bugungi biznes holati:</p>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-5">
        {user?.role !== 'shop' && (
          <>
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="flex items-center mb-4">
                <Package className="w-6 h-6 text-blue-600 mr-2" />
                <span className="text-gray-600">Umumiy mahsulotlar</span>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900">{stats.totalProducts}</h3>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="flex items-center mb-4">
                <Users className="w-6 h-6 text-blue-600 mr-2" />
                <span className="text-gray-600">Umumiy dilerlar</span>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900">{stats.totalDealers}</h3>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="flex items-center mb-4">
                <Store className="w-6 h-6 text-blue-600 mr-2" />
                <span className="text-gray-600">Umumiy do‘konlar</span>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900">{stats.totalShops}</h3>
            </div>
          </>
        )}

        <div className="p-6 bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <TrendingUp className="w-6 h-6 text-blue-600 mr-2" />
              <span className="text-gray-600">Umumiy sotuvlar</span>
            </div>
            <div className="relative">
              <select
                value={salesFilter}
                onChange={handleSalesFilterChange}
                className="appearance-none w-full p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">Bugun</option>
                <option value="yesterday">Kuni kecha</option>
                <option value="last_7_days">Oxirgi 7 kun</option>
                <option value="this_month">Ushbu oy</option>
                <option value="this_year">Ushbu yil</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900">{stats.totalSales.toLocaleString()} UZS</h3>
        </div>

        <div className="p-6 bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Undo2 className="w-6 h-6 text-blue-600 mr-2" />
              <span className="text-gray-600">Umumiy qaytarishlar</span>
            </div>
            <div className="relative">
              <select
                value={returnsFilter}
                onChange={handleReturnsFilterChange}
                className="appearance-none w-full p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">Bugun</option>
                <option value="yesterday">Kuni kecha</option>
                <option value="last_7_days">Oxirgi 7 kun</option>
                <option value="this_month">Ushbu oy</option>
                <option value="this_year">Ushbu yil</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900">{stats.totalReturns.toLocaleString()} UZS</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="p-6 bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">So‘nggi sotuvlar</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {paginatedSales.length > 0 ? (
              paginatedSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg shadow-sm hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Store className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p
                        className="font-semibold text-gray-800 cursor-pointer hover:text-blue-600"
                        onClick={() => handleSaleClick(sale)}
                      >
                        Sotuv {sale.id}
                      </p>
                      <p className="text-sm text-gray-600">{getUsername(sale.sotib_oluvchi)}</p>
                      <p className="text-xs text-gray-500">{formatToTashkentTime(sale.sana)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      {parseFloat(sale.total_sum || '0').toLocaleString()} UZS
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <p>So‘nggi sotuvlar mavjud emas</p>
              </div>
            )}
          </div>
          {sales.length > itemsPerPage && (
            <div className="mt-4 flex justify-between items-center">
              <button
                onClick={handlePreviousPageSales}
                disabled={currentPageSales === 1}
                className={`px-4 py-2 rounded-md ${
                  currentPageSales === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Oldingi
              </button>
              <span className="text-sm text-gray-600">{currentPageSales} / {totalPagesSales}</span>
              <button
                onClick={handleNextPageSales}
                disabled={currentPageSales === totalPagesSales}
                className={`px-4 py-2 rounded-md ${
                  currentPageSales === totalPagesSales
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Keyingi
              </button>
            </div>
          )}
        </div>

        <div className="p-6 bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">So‘nggi qaytarishlar</h3>
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {paginatedReturns.length > 0 ? (
              paginatedReturns.map((returnItem) => (
                <div
                  key={returnItem.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg shadow-sm hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Undo2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p
                        className="font-semibold text-gray-800 cursor-pointer hover:text-blue-600"
                        onClick={() => handleReturnClick(returnItem)}
                      >
                        Qaytarish {returnItem.id}
                      </p>
                      <p className="text-sm text-gray-600">{getUsername(returnItem.qaytaruvchi)}</p>
                      <p className="text-xs text-gray-500">{formatToTashkentTime(returnItem.sana)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">
                      {parseFloat(returnItem.total_sum || '0').toLocaleString()} UZS
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <p>So‘nggi qaytarishlar mavjud emas</p>
              </div>
            )}
          </div>
          {returns.length > itemsPerPage && (
            <div className="mt-4 flex justify-between items-center">
              <button
                onClick={handlePreviousPageReturns}
                disabled={currentPageReturns === 1}
                className={`px-4 py-2 rounded-md ${
                  currentPageReturns === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Oldingi
              </button>
              <span className="text-sm text-gray-600">{currentPageReturns} / {totalPagesReturns}</span>
              <button
                onClick={handleNextPageReturns}
                disabled={currentPageReturns === totalPagesReturns}
                className={`px-4 py-2 rounded-md ${
                  currentPageReturns === totalPagesReturns
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Keyingi
              </button>
            </div>
          )}
        </div>
      </div>

      {/* So‘nggi harajatlar bo‘limi */}
      <div className="mt-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <ShoppingCart className="w-6 h-6 text-orange-600 mr-2" />
              <h3 className="text-xl font-semibold text-gray-900">So‘nggi harajatlar</h3>
            </div>
          </div>
          <div className="flex items-center justify-between mb-6">
            <span className="text-2xl font-semibold text-orange-600">
              Umumiy harajatlar: {stats.totalPurchases.toLocaleString()} UZS
            </span>
            <div className="relative w-48">
              <select
                value={purchasesFilter}
                onChange={handlePurchasesFilterChange}
                className="appearance-none w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
              >
                <option value="today">Bugun</option>
                <option value="yesterday">Kuni kecha</option>
                <option value="last_7_days">Oxirgi 7 kun</option>
                <option value="this_month">Ushbu oy</option>
                <option value="this_year">Ushbu yil</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {paginatedPurchases.length > 0 ? (
              paginatedPurchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg shadow-sm hover:bg-orange-50 transition-colors duration-200 border border-gray-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-orange-100 rounded-full">
                      <ShoppingCart className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p
                        className="font-semibold text-gray-800 cursor-pointer hover:text-orange-600 transition-colors duration-150"
                        onClick={() => handlePurchaseClick(purchase)}
                      >
                        Xarid #{purchase.id}
                      </p>
                      <p className="text-sm text-gray-600">{getSupplierName(purchase.yetkazib_beruvchi)}</p>
                      <p className="text-xs text-gray-500">{formatToTashkentTime(purchase.sana)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-orange-600">
                      {parseFloat(purchase.total_sum || '0').toLocaleString()} UZS
                    </p>
                    <p className="text-xs text-gray-500">{getWarehouseName(purchase.ombor)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>So‘nggi harajatlar mavjud emas</p>
              </div>
            )}
          </div>
          {filteredPurchases.length > itemsPerPage && (
            <div className="mt-6 flex justify-between items-center">
              <button
                onClick={handlePreviousPagePurchases}
                disabled={currentPagePurchases === 1}
                className={`px-4 py-2 rounded-lg font-medium ${
                  currentPagePurchases === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-orange-600 text-white hover:bg-orange-700 transition-colors duration-200'
                }`}
              >
                Oldingi
              </button>
              <span className="text-sm text-gray-600 font-medium">
                {currentPagePurchases} / {totalPagesPurchases}
              </span>
              <button
                onClick={handleNextPagePurchases}
                disabled={currentPagePurchases === totalPagesPurchases}
                className={`px-4 py-2 rounded-lg font-medium ${
                  currentPagePurchases === totalPagesPurchases
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-orange-600 text-white hover:bg-orange-700 transition-colors duration-200'
                }`}
              >
                Keyingi
              </button>
            </div>
          )}
        </div>
      </div>

      {isSaleModalOpen && selectedSale && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl">
            <h2 className="text-lg font-medium mb-4">Sotuv {selectedSale.id} haqida ma'lumot</h2>
            <div className="space-y-4">
              <p><strong>Sana:</strong> {formatToTashkentTime(selectedSale.sana)}</p>
              <p><strong>Sotib oluvchi:</strong> {getUsername(selectedSale.sotib_oluvchi)}</p>
              <p><strong>Umumiy summa:</strong> {parseFloat(selectedSale.total_sum || '0').toLocaleString()} UZS</p>
              <p><strong>Ombor:</strong> {getWarehouseName(selectedSale.ombor)}</p>
            </div>
            <div className="mt-6">
              <h3 className="text-md font-medium mb-2">Sotuvdagi mahsulotlar</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mahsulot nomi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Soni</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Narx</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedSale.items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{getProductName(item.mahsulot)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.soni}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{parseFloat(item.narx || '0').toLocaleString()} UZS</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsSaleModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors duration-200"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {isPurchaseModalOpen && selectedPurchase && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl">
            <h2 className="text-lg font-medium mb-4">Xarid {selectedPurchase.id} haqida ma'lumot</h2>
            <div className="space-y-4">
              <p><strong>Yetkazib beruvchi:</strong> {getSupplierName(selectedPurchase.yetkazib_beruvchi)}</p>
              <p><strong>Ombor:</strong> {getWarehouseName(selectedPurchase.ombor)}</p>
              <p><strong>Umumiy summa:</strong> {parseFloat(selectedPurchase.total_sum || '0').toLocaleString()} UZS</p>
              <p><strong>Sana:</strong> {formatToTashkentTime(selectedPurchase.sana)}</p>
            </div>
            <div className="mt-6">
              <h3 className="text-md font-medium mb-2">Xariddagi mahsulotlar</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mahsulot nomi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Soni</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Narx</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedPurchase.items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{getProductName(item.mahsulot)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.soni}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{parseFloat(item.narx || '0').toLocaleString()} UZS</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsPurchaseModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors duration-200"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {isReturnModalOpen && selectedReturn && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl">
            <h2 className="text-lg font-medium mb-4">Qaytarish {selectedReturn.id} haqida ma'lumot</h2>
            <div className="space-y-4">
              <p><strong>Sana:</strong> {formatToTashkentTime(selectedReturn.sana)}</p>
              <p><strong>Qaytaruvchi:</strong> {getUsername(selectedReturn.qaytaruvchi)}</p>
              <p><strong>Umumiy summa:</strong> {parseFloat(selectedReturn.total_sum || '0').toLocaleString()} UZS</p>
              <p><strong>Ombor:</strong> {getWarehouseName(selectedReturn.ombor)}</p>
            </div>
            <div className="mt-6">
              <h3 className="text-md font-medium mb-2">Qaytarilgan mahsulotlar</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mahsulot nomi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Soni</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Narx</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedReturn.items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{getProductName(item.mahsulot)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.soni}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{parseFloat(item.narx || '0').toLocaleString()} UZS</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors duration-200"
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