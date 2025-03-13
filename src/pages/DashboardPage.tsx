import React, { useEffect, useState } from 'react';
import { BarChart3, Package, Users, Store, FileText, TrendingUp } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

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

interface Activity {
  id: number;
  name: string;
  current_stock: number;
}

export default function DashboardPage() {
  const { user, token } = useAuthStore();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalDealers: 0,
    totalShops: 0,
    totalSales: 0,
  });
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]); // Mahsulotlar ro'yxati
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchData = async () => {
      if (!token || !user) {
        setError('Autentifikatsiya tokeni yoki foydalanuvchi topilmadi.');
        setLoading(false);
        return;
      }

      try {
        const config = {
          headers: { Authorization: `JWT ${token}` },
        };

        const productsRes = await axios.get('https://lemoonapi.cdpos.uz:444/mahsulotlar/', config);
        let totalProducts = productsRes.data.count || 0;
        setProducts(Array.isArray(productsRes.data.results) ? productsRes.data.results : productsRes.data);

        const usersRes = await axios.get('https://lemoonapi.cdpos.uz:444/users/', config);
        let usersData = Array.isArray(usersRes.data.results) ? usersRes.data.results : usersRes.data;
        setUsers(usersData);
        let totalDealers = 0;
        let totalShops = 0;

        if (user.role === 'dealer') {
          totalShops = usersData.filter((u: any) => u.user_type === 'shop' && u.created_by === user.id).length;
          totalDealers = 0;
        } else if (user.role === 'shop') {
          totalDealers = 0;
          totalShops = 0;
        } else {
          totalDealers = usersData.filter((u: any) => u.user_type === 'dealer').length;
          totalShops = usersData.filter((u: any) => u.user_type === 'shop').length;
        }

        const salesReportRes = await axios.get('https://lemoonapi.cdpos.uz:444/sotuv-hisoboti/', config);
        let salesReports = salesReportRes.data;
        let totalSales = 0;

        if (user.role === 'dealer') {
          const dealerShops = usersData.filter((u: any) => u.user_type === 'shop' && u.created_by === user.id).map((u: any) => u.id);
          totalSales = salesReports
            .filter((report: any) => dealerShops.includes(report.created_by))
            .reduce((sum: number, report: any) => sum + parseFloat(report.total_sum || 0), 0);
        } else if (user.role === 'shop') {
          totalSales = salesReports
            .filter((report: any) => report.created_by === user.id)
            .reduce((sum: number, report: any) => sum + parseFloat(report.total_sum || 0), 0);
        } else {
          totalSales = salesReports.reduce((sum: number, report: any) => sum + parseFloat(report.total_sum || 0), 0);
        }

        const recentSalesRes = await axios.get('https://lemoonapi.cdpos.uz:444/sotuvlar/', config);
        let salesData = recentSalesRes.data.results || recentSalesRes.data || [];
        if (user.role === 'dealer') {
          const dealerShops = usersData.filter((u: any) => u.user_type === 'shop' && u.created_by === user.id).map((u: any) => u.id);
          salesData = salesData.filter((sale: Sale) => dealerShops.includes(sale.sotib_oluvchi));
        } else if (user.role === 'shop') {
          salesData = salesData.filter((sale: Sale) => sale.sotib_oluvchi === user.id);
        }
        setRecentSales(salesData.sort((a: Sale, b: Sale) => new Date(b.sana).getTime() - new Date(a.sana).getTime()));

        const activitiesRes = await axios.get('https://lemoonapi.cdpos.uz:444/omborlar/', config);
        let activitiesData = Array.isArray(activitiesRes.data.results) ? activitiesRes.data.results : activitiesRes.data;
        if (user.role === 'dealer' || user.role === 'shop') {
          activitiesData = activitiesData.filter((activity: any) => activity.responsible_person === user.id);
        }
        setRecentActivities(activitiesData.slice(0, 3));

        setStats({
          totalProducts,
          totalDealers,
          totalShops,
          totalSales,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Ma\'lumotlarni yuklashda xatolik yuz berdi');
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchData();
  }, [token, user]);

  const getUsername = (userId: number) => {
    const foundUser = users.find((u) => u.id === userId);
    return foundUser ? foundUser.username : `Foydalanuvchi #${userId}`;
  };

  const getProductName = (productId: number) => {
    const foundProduct = products.find((p) => p.id === productId);
    return foundProduct ? foundProduct.name : `Mahsulot #${productId}`;
  };

  const handleSaleClick = (sale: Sale) => {
    setSelectedSale(sale);
    setIsSaleModalOpen(true);
  };

  const totalPages = Math.ceil(recentSales.length / itemsPerPage);
  const paginatedSales = recentSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  if (loading) {
    return <div className="p-6">Yuklanmoqda...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Xush kelibsiz, {user?.username}!</h1>
        <p className="text-gray-600">Bugungi biznes holati:</p>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
        {(user?.role !== 'shop') && (
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
          <div className="flex items-center mb-4">
            <TrendingUp className="w-6 h-6 text-blue-600 mr-2" />
            <span className="text-gray-600">Umumiy sotuvlar</span>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900">{stats.totalSales.toLocaleString()} UZS</h3>
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
                      <p className="text-xs text-gray-500">{new Date(sale.sana).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{parseFloat(sale.total_sum).toLocaleString()} UZS</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <p>So‘nggi sotuvlar mavjud emas</p>
              </div>
            )}
          </div>
          {recentSales.length > itemsPerPage && (
            <div className="mt-4 flex justify-between">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-md ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                Oldingi
              </button>
              <span className="self-center text-sm text-gray-600">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-md ${currentPage === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                Keyingi
              </button>
            </div>
          )}
        </div>

        <div className="p-6 bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">So‘nggi faoliyatlar</h3>
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg shadow-sm hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="p-2 bg-blue-50 rounded-full">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">Ombor yangilanishi</p>
                    <p className="text-sm text-gray-600">{activity.name}</p>
                    <p className="text-xs text-gray-500">Stock: {activity.current_stock}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <p>Faoliyatlar mavjud emas</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isSaleModalOpen && selectedSale && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl">
            <h2 className="text-lg font-medium mb-4">Sotuv {selectedSale.id} haqida ma'lumot</h2>
            <div className="space-y-4">
              <p><strong>Sana:</strong> {new Date(selectedSale.sana).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p><strong>Sotib oluvchi:</strong> {getUsername(selectedSale.sotib_oluvchi)}</p>
              <p><strong>Umumiy summa:</strong> {parseFloat(selectedSale.total_sum).toLocaleString()} UZS</p>
              <p><strong>Ombor ID:</strong> {selectedSale.ombor}</p>
            </div>
            <div className="mt-6">
              <h3 className="text-md font-medium mb-2">Sotuvdagi mahsulotlar</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
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
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsSaleModalOpen(false)}
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