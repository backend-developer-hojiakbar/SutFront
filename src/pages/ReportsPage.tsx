import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, TrendingUp, Download, Eye } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';

const BASE_URL = 'https://lemoonapi.cdpos.uz:444/';

interface ReportData {
  id: number;
  month?: string;
  total_sum?: number;
  ombor__name?: string;
  total_mahsulot?: number;
  created_by: number;
  created_at: string;
}

interface PaymentData {
  id: number;
  user: number;
  sana: string;
  summa: string;
  typeSotuv: 'naqd' | 'karta' | 'shot';
  created_by: number;
  created_at: string;
}

interface User {
  id: number;
  username: string;
}

const ReportsPage: React.FC = () => {
  const { token, user } = useAuthStore();
  const navigate = useNavigate();
  const [sotuvHisoboti, setSotuvHisoboti] = useState<ReportData[]>([]);
  const [xaridHisoboti, setXaridHisoboti] = useState<ReportData[]>([]);
  const [omborHisoboti, setOmborHisoboti] = useState<ReportData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const apiConfig = {
    headers: { Authorization: `JWT ${token}` },
  };

  // Faqat admin va omborchi uchun ruxsat berish
  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'omborchi') {
      navigate('/dashboard');
      setError('Sizda hisobotlarni ko‘rish uchun ruxsat yo‘q.');
    } else if (user && (user.role === 'admin' || user.role === 'omborchi')) {
      fetchReports();
    }
  }, [user, navigate]);

  const fetchReports = async () => {
    if (!token || !user) {
      setError('Autentifikatsiya tokeni yoki foydalanuvchi topilmadi.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [
        usersRes,
        sotuvRes,
        xaridRes,
        omborRes,
        paymentsRes,
      ] = await Promise.all([
        axios.get(`${BASE_URL}users/`, apiConfig),
        axios.get(`${BASE_URL}sotuv-hisoboti/`, apiConfig),
        axios.get(`${BASE_URL}xarid-hisoboti/`, apiConfig),
        axios.get(`${BASE_URL}ombor-hisoboti/`, apiConfig),
        axios.get(`${BASE_URL}payments/`, apiConfig),
      ]);

      const usersData = Array.isArray(usersRes.data.results) ? usersRes.data.results : usersRes.data;
      setUsers(usersData);

      let sotuvData = Array.isArray(sotuvRes.data.results) ? sotuvRes.data.results : sotuvRes.data;
      let xaridData = Array.isArray(xaridRes.data.results) ? xaridRes.data.results : xaridRes.data;
      let omborData = Array.isArray(omborRes.data.results) ? omborRes.data.results : omborRes.data;
      let paymentsData = Array.isArray(paymentsRes.data.results) ? paymentsRes.data.results : paymentsRes.data;

      // Ruxsatlarni tekshirish
      if (user.role === 'dealer') {
        const dealerShops = usersData.filter((u: any) => u.user_type === 'shop' && u.created_by === user.id).map((u: any) => u.id);
        sotuvData = sotuvData.filter((report: ReportData) => dealerShops.includes(report.created_by));
        xaridData = xaridData.filter((report: ReportData) => report.created_by === user.id);
        omborData = omborData.filter((report: ReportData) => report.created_by === user.id);
        paymentsData = paymentsData.filter((payment: PaymentData) => dealerShops.includes(payment.user));
      } else if (user.role === 'shop') {
        sotuvData = sotuvData.filter((report: ReportData) => report.created_by === user.id);
        xaridData = xaridData.filter((report: ReportData) => report.created_by === user.id);
        omborData = omborData.filter((report: ReportData) => report.created_by === user.id);
        paymentsData = paymentsData.filter((payment: PaymentData) => payment.user === user.id);
      }

      // Ma'lumotlarni to'g'ri formatga keltirish
      paymentsData = paymentsData.map((payment: any, idx: number) => ({
        id: payment.id || idx + 1,
        user: payment.user,
        sana: payment.sana || new Date().toISOString().split('T')[0],
        summa: payment.summa || '0',
        typeSotuv: payment.typeSotuv || 'naqd',
        created_by: payment.created_by || user.id,
        created_at: payment.created_at || new Date().toISOString(),
      }));

      setSotuvHisoboti(sotuvData);
      setXaridHisoboti(xaridData);
      setOmborHisoboti(omborData);
      setPayments(paymentsData);
      setNotification('Hisobotlar muvaffaqiyatli yuklandi!');
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      console.error('Hisobotlarni yuklashda xatolik:', err.response?.data || err.message);
      setError(err.response?.data?.detail || 'Hisobotlarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (reportType: string) => {
    if (user?.role !== 'admin' && user?.role !== 'omborchi') {
      setError('Hisobot yaratish faqat admin va omborchi uchun mavjud.');
      return;
    }

    setLoading(true);
    try {
      let response;
      switch (reportType) {
        case 'sotuv':
          response = await axios.get(`${BASE_URL}sotuv-hisoboti/`, apiConfig);
          setSotuvHisoboti(Array.isArray(response.data.results) ? response.data.results : response.data);
          break;
        case 'xarid':
          response = await axios.get(`${BASE_URL}xarid-hisoboti/`, apiConfig);
          setXaridHisoboti(Array.isArray(response.data.results) ? response.data.results : response.data);
          break;
        case 'ombor':
          response = await axios.get(`${BASE_URL}ombor-hisoboti/`, apiConfig);
          setOmborHisoboti(Array.isArray(response.data.results) ? response.data.results : response.data);
          break;
        case 'payments':
          response = await axios.get(`${BASE_URL}payments/`, apiConfig);
          setPayments(Array.isArray(response.data.results) ? response.data.results : response.data);
          break;
        default:
          throw new Error('Noma\'lum hisobot turi');
      }
      setNotification(`${reportType} hisoboti muvaffaqiyatli yangilandi!`);
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      console.error('Hisobot yaratishda xatolik:', err.response?.data || err.message);
      setError('Hisobotni yangilashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = (reportName: string) => {
    let data;
    switch (reportName) {
      case 'Sotuv Hisoboti': data = sotuvHisoboti; break;
      case 'Xarid Hisoboti': data = xaridHisoboti; break;
      case 'Ombor Hisoboti': data = omborHisoboti; break;
      case 'To\'lovlar Hisoboti': data = payments; break; // To'g'ri belgilar bilan
      default: return;
    }
    localStorage.setItem('selectedReport', JSON.stringify({ name: reportName, data }));
    navigate('/report-detail');
  };

  const handleDownloadReport = (reportName: string) => {
    let dataToExport;
    switch (reportName) {
      case 'Sotuv Hisoboti':
        dataToExport = sotuvHisoboti.map(item => ({
          ID: item.id,
          Oy: item.month || 'Noma\'lum',
          Jami_Summa: item.total_sum ? `${item.total_sum.toLocaleString()} UZS` : 'N/A',
          Ombor: item.ombor__name || 'Noma\'lum',
          Yaratilgan_Sana: item.created_at,
        }));
        break;
      case 'Xarid Hisoboti':
        dataToExport = xaridHisoboti.map(item => ({
          ID: item.id,
          Oy: item.month || 'Noma\'lum',
          Jami_Summa: item.total_sum ? `${item.total_sum.toLocaleString()} UZS` : 'N/A',
          Ombor: item.ombor__name || 'Noma\'lum',
          Yaratilgan_Sana: item.created_at,
        }));
        break;
      case 'Ombor Hisoboti':
        dataToExport = omborHisoboti.map(item => ({
          ID: item.id,
          Ombor: item.ombor__name || 'Noma\'lum',
          Jami_Mahsulot: item.total_mahsulot ? `${item.total_mahsulot} dona` : 'N/A',
          Yaratilgan_Sana: item.created_at,
        }));
        break;
      case 'To\'lovlar Hisoboti':
        dataToExport = payments.map(item => ({
          ID: item.id,
          Foydalanuvchi: users.find(u => u.id === item.user)?.username || 'Noma\'lum',
          Sana: item.sana,
          Summa: `${parseFloat(item.summa).toLocaleString()} UZS`,
          Tolov_Turi: item.typeSotuv, // To'g'ri apostrof bilan
          Yaratilgan_Sana: item.created_at,
        }));
        break;
      default:
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, reportName.replace(' ', '_'));
    XLSX.writeFile(workbook, `${reportName.replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    setNotification(`${reportName} muvaffaqiyatli yuklab olindi!`);
    setTimeout(() => setNotification(null), 3000);
  };

  const reports = [
    {
      id: 1,
      name: 'Sotuv Hisoboti',
      description: 'Oylik sotuv ko‘rsatkichlari va tendensiyalari',
      icon: BarChart3,
      color: 'blue',
      data: sotuvHisoboti,
      type: 'sotuv',
    },
    {
      id: 2,
      name: 'Xarid Hisoboti',
      description: 'Oylik xarid ko‘rsatkichlari va tendensiyalari',
      icon: PieChart,
      color: 'green',
      data: xaridHisoboti,
      type: 'xarid',
    },
    {
      id: 3,
      name: 'Ombor Hisoboti',
      description: 'Joriy ombor holati va mahsulot harakati',
      icon: TrendingUp,
      color: 'purple',
      data: omborHisoboti,
      type: 'ombor',
    },
  ];

  const recentReports = payments
    .map((payment) => ({
      id: payment.id,
      name: 'To\'lov Hisoboti',
      created_at: payment.sana,
      created_by: payment.user,
      typeSotuv: payment.typeSotuv,
      summa: payment.summa,
    }))
    .filter(report => 
      (!selectedUser || report.created_by === selectedUser) &&
      (!selectedPaymentType || report.typeSotuv === selectedPaymentType)
    );

  if (loading) return <div className="p-6">Yuklanmoqda...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      {notification && (
        <div className="fixed top-4 right-4 bg-green-500 text-white p-4 rounded-md shadow-lg z-50">
          {notification}
        </div>
      )}

      {(user?.role === 'admin' || user?.role === 'omborchi') && (
        <div className="mb-8">
          <h2 className="text-lg font-medium mb-4">Mavjud Hisobotlar</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => {
              const Icon = report.icon;
              const total = report.data.reduce((sum, item) => sum + (parseFloat(item.total_sum || item.summa || '0') || item.total_mahsulot || 0), 0);
              return (
                <div key={report.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 bg-${report.color}-100 rounded-lg`}>
                      <Icon className={`h-6 w-6 text-${report.color}-600`} />
                    </div>
                    <button
                      onClick={() => handleDownloadReport(report.name)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{report.name}</h3>
                  <p className="text-sm text-gray-500 mb-2">{report.description}</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Jami: {total.toLocaleString()} {report.id === 3 ? 'dona' : 'UZS'}
                  </p>
                  <button
                    onClick={() => handleGenerateReport(report.type)}
                    className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                  >
                    Hisobotni Yaratish
                  </button>
                  <button
                    onClick={() => handleViewReport(report.name)}
                    className="mt-2 w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 flex items-center justify-center"
                  >
                    <Eye className="h-4 w-4 mr-1" /> Ko‘rish
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">So‘nggi Hisobotlar</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Foydalanuvchi:</label>
              <select
                value={selectedUser || ''}
                onChange={(e) => setSelectedUser(e.target.value ? parseInt(e.target.value) : null)}
                className="p-2 border rounded-md"
              >
                <option value="">Hammasi</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.username}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">To‘lov turi:</label>
              <select
                value={selectedPaymentType}
                onChange={(e) => setSelectedPaymentType(e.target.value)}
                className="p-2 border rounded-md"
              >
                <option value="">Hammasi</option>
                <option value="naqd">Naqd</option>
                <option value="karta">Karta</option>
                <option value="shot">Shot</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hisobot Nomi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Foydalanuvchi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sana
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Summa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  To‘lov Turi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Harakatlar
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentReports.length > 0 ? (
                recentReports.map((report) => (
                  <tr key={report.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{report.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {users.find(u => u.id === report.created_by)?.username || 'Noma\'lum'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.created_at}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {parseFloat(report.summa).toLocaleString()} UZS
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.typeSotuv}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleViewReport('To\'lovlar Hisoboti')}
                        className="text-blue-600 hover:text-blue-900 mr-4 flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-1" /> Ko‘rish
                      </button>
                      <button
                        onClick={() => handleDownloadReport('To\'lovlar Hisoboti')}
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                      >
                        <Download className="h-4 w-4 mr-1" /> Yuklab olish
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    So‘nggi hisobotlar mavjud emas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;