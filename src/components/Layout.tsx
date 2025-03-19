import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Warehouse, Users, Store, ShoppingCart, FileText, Settings, Box, ReplyIcon } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  // Menyu elementlari
  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/warehouse', label: 'Ombor', icon: Warehouse },
    { path: '/dealers', label: 'Dilerlar', icon: Users }, // Bu dealer uchun ko‘rinmaydi
    { path: '/shops', label: 'Do\'konlar', icon: Store },
    { path: '/sales', label: 'Sotuvlar', icon: ShoppingCart },
    { path: '/reports', label: 'Hisobotlar', icon: FileText },
    { path: '/settings', label: 'Sozlamalar', icon: Settings },
    { path: '/products', label: 'Mahsulotlar', icon: Box }, 
    {path: '/qaytarish', label: 'Sotuv Qaytarish', icon: ReplyIcon}// Bu dealer uchun ko‘rinmaydi
  ];

  // Dealer uchun Products va Dealers sahifalarini filtrlab olib tashlash
  const filteredMenuItems = user?.user_type === 'dealer'
    ? menuItems.filter(item => item.path !== '/products' && item.path !== '/dealers')
    : menuItems;

  return (
    <div className="w-64 bg-white shadow-md h-screen flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold text-gray-800">LEMOON</h1>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {filteredMenuItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center p-2 rounded-md ${
                  location.pathname === item.path
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon className="h-5 w-5 mr-2" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="flex items-center w-full p-2 text-gray-600 hover:bg-gray-100 rounded-md"
        >
          <LogOut className="h-5 w-5 mr-2" />
          Chiqish
        </button>
      </div>
    </div>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 bg-gray-50">{children}</main>
    </div>
  );
};

export default Layout;