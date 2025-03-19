import React from 'react';
import { useNavigate } from 'react-router-dom';

const ReportDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const report = JSON.parse(localStorage.getItem('selectedReport') || '{}');
  const { name, data } = report;

  if (!name || !data) {
    return <div className="p-6">Hisobot topilmadi</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{name}</h2>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
        >
          Orqaga
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              {data[0]?.month && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oy</th>}
              {data[0]?.total_sum && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jami Summa (UZS)</th>}
              {data[0]?.ombor__name && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ombor Nomi</th>}
              {data[0]?.total_mahsulot && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jami Mahsulot (dona)</th>}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yaratuvchi</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yaratilgan Sana</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item: any) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.id}</td>
                {item.month && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.month}</td>}
                {item.total_sum && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.total_sum.toLocaleString()}</td>}
                {item.ombor__name && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.ombor__name}</td>}
                {item.total_mahsulot && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.total_mahsulot.toLocaleString()}</td>}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.created_by}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.created_at.split('T')[0]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportDetailPage;