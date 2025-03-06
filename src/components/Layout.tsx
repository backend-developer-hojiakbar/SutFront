import React from 'react';
import { useCurrencyStore } from '../store/currencyStore';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Store, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X,
  ShoppingCart
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const baseNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Warehouse', href: '/warehouse', icon: Package },
  { name: 'Dealers', href: '/dealers', icon: Users },
  { name: 'Shops', href: '/shops', icon: Store },
  { name: 'Sales', href: '/sales', icon: ShoppingCart },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Products', href: '/products', icon: Package },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();

  const handleLogout = () => {
    setUser(null);
    navigate('/login');
  };

  // Foydalanuvchi turiga qarab navigatsiyani filtrlaymiz
  const getFilteredNavigation = () => {
    if (!user?.role) return [];
    const role = user.role.toLowerCase();
    
    if (role === 'admin' || role === 'omborchi') {
      return baseNavigation; // Hamma bo‘limlar ko‘rinadi
    }
    
    if (role === 'dealer') {
      return baseNavigation.filter(item => 
        ['Dashboard', 'Warehouse', 'Dealers', 'Shops', 'Sales', 'Reports', 'Settings'].includes(item.name)
      ); // Products ko‘rinmaydi
    }
    
    if (role === 'shop') {
      return baseNavigation.filter(item => 
        ['Settings', 'Warehouse'].includes(item.name)
      ); // Faqat Settings va Warehouse
    }
    
    return [];
  };

  const navigation = getFilteredNavigation();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed top-0 right-0 p-4 bg-white shadow-md rounded-bl-lg z-50">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Exchange rate"
              className="w-40 pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              onChange={(e) => useCurrencyStore.getState().setExchangeRate(Number(e.target.value))}
            />
            <span className="absolute inset-y-0 right-3 flex items-center text-gray-400 text-sm">
              UZS/USD
            </span>
          </div>
          <span className="text-sm text-gray-600 whitespace-nowrap">
            1 USD = {useCurrencyStore().exchangeRate.toFixed(2)} UZS
          </span>
        </div>
      </div>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-6">
            <span className="text-xl font-semibold">MMS</span>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                      location.pathname === item.href
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white">
        <div className="flex h-16 items-center justify-center px-6">
          <span className="text-xl font-semibold">MMS</span>
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                    location.pathname === item.href
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-10 flex h-16 bg-white shadow-sm">
          <button
            type="button"
            className="px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex flex-1 items-center justify-between px-6">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold">
                {navigation.find((item) => item.href === location.pathname)?.name || 'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{user?.username}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        <main>{children}</main>
      </div>
    </div>
  );
}