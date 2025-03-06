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
  const [payments, setPayments] = useState<PaymentData[]>([]); // To‘lovlar uchun yangi holat
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>(''); // To‘lov turi filtri
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiConfig = {
    headers: { Authorization: `JWT ${token}` },
  };

  const fetchReports = async () => {
    if (!token || !user) {
      setError('Autentifikatsiya tokeni yoki foydalanuvchi topilmadi.');
      setLoading(false);
      return;
    }

    try {
      // Foydalanuvchi ma'lumotlarini olish
      const usersRes = await axios.get(`${BASE_URL}users/`, apiConfig);
      const usersData = Array.isArray(usersRes.data.results) ? usersRes.data.results : usersRes.data;
      setUsers(usersData);

      // Hisobotlarni olish
      const sotuvRes = await axios.get(`${BASE_URL}sotuv-hisoboti/`, apiConfig);
      let sotuvData = sotuvRes.data;
      const xaridRes = await axios.get(`${BASE_URL}xarid-hisoboti/`, apiConfig);
      let xaridData = xaridRes.data;
      const omborRes = await axios.get(`${BASE_URL}ombor-hisoboti/`, apiConfig);
      let omborData = omborRes.data;

      // To‘lovlarni olish
      const paymentsRes = await axios.get(`${BASE_URL}payments/`, apiConfig);
      console.log("Payments Response:", JSON.stringify(paymentsRes.data, null, 2));
      let paymentsData = Array.isArray(paymentsRes.data.results) ? paymentsRes.data.results : paymentsRes.data;
      paymentsData = paymentsData.map((payment: any, idx: number) => ({
        id: payment.id || idx + 1,
        user: payment.user,
        sana: payment.sana,
        summa: payment.summa,
        typeSotuv: payment.typeSotuv,
        created_by: user.id, // Yaratuvchi sifatida joriy foydalanuvchi
        created_at: payment.created_at || new Date().toISOString(),
      }));

      // Rol bo‘yicha filtr
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

      setSotuvHisoboti(sotuvData);
      setXaridHisoboti(xaridData);
      setOmborHisoboti(omborData);
      setPayments(paymentsData);

    } catch (err: any) {
      console.error('Hisobotlarni yuklashda xatolik:', err.response?.data || err.message);
      setError(err.response?.data?.detail || 'Hisobotlarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [token, user]);

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
          setSotuvHisoboti(response.data);
          break;
        case 'xarid':
          response = await axios.get(`${BASE_URL}xarid-hisoboti/`, apiConfig);
          setXaridHisoboti(response.data);
          break;
        case 'ombor':
          response = await axios.get(`${BASE_URL}ombor-hisoboti/`, apiConfig);
          setOmborHisoboti(response.data);
          break;
        default:
          throw new Error('Noma\'lum hisobot turi');
      }
      console.log(`${reportType} Hisoboti yangilandi:`, response.data);
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
      case 'To‘lovlar Hisoboti': data = payments; break;
      default: return;
    }
    localStorage.setItem('selectedReport', JSON.stringify({ name: reportName, data }));
    navigate('/report-detail');
  };

  const handleDownloadReport = (reportName: string) => {
    let data;
    switch (reportName) {
      case 'Sotuv Hisoboti': data = sotuvHisoboti; break;
      case 'Xarid Hisoboti': data = xaridHisoboti; break;
      case 'Ombor Hisoboti': data = omborHisoboti; break;
      case 'To‘lovlar Hisoboti': data = payments; break;
      default: return;
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, reportName);
    XLSX.writeFile(workbook, `${reportName.replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
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
    {
      id: 4,
      name: 'To‘lovlar Hisoboti',
      description: 'Foydalanuvchilar bo‘yicha to‘lovlar',
      icon: TrendingUp,
      color: 'orange',
      data: payments,
      type: 'payments',
    },
  ];

  const recentReports = payments
    .map((payment) => ({
      id: payment.id,
      name: 'To‘lov Hisoboti',
      created_at: payment.sana, // Sana to‘lovdan olinadi
      created_by: payment.user, // Foydalanuvchi ID si
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
      {(user?.role === 'admin' || user?.role === 'omborchi') && (
        <div className="mb-8">
          <h2 className="text-lg font-medium mb-4">Mavjud Hisobotlar</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => {
              const Icon = report.icon;
              const total = report.data.reduce((sum, item) => sum + (parseFloat(item.total_sum || item.summa) || item.total_mahsulot || 0), 0);
              return (
                <div key={report.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 bg-${report.color}-100 rounded-lg`}>
                      <Icon className={`h-6 w-6 text-${report.color}-600`} />
                    </div>
                    <button className="text-gray-400 hover:text-gray-500">
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
              {recentReports.map((report) => (
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
                      onClick={() => handleViewReport('To‘lovlar Hisoboti')}
                      className="text-blue-600 hover:text-blue-900 mr-4 flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-1" /> Ko‘rish
                    </button>
                    <button
                      onClick={() => handleDownloadReport('To‘lovlar Hisoboti')}
                      className="text-blue-600 hover:text-blue-900 flex items-center"
                    >
                      <Download className="h-4 w-4 mr-1" /> Yuklab olish
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;