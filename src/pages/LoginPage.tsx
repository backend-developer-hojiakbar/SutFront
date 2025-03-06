import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser, setToken } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // API ga so'rov yuborish
      const response = await axios.post(
        'https://lemoonapi.cdpos.uz:444/login/',
        { username, password },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const { access, refresh } = response.data;

      // Tokenni saqlash
      setToken(access);
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);

      // Foydalanuvchi ma'lumotlarini olish
      const userResponse = await axios.get('https://lemoonapi.cdpos.uz:444/users/current_user/', {
        headers: { Authorization: `JWT ${access}` },
      });

      // Foydalanuvchi ma'lumotlarini saqlash
      setUser({
        id: userResponse.data.id,
        username: userResponse.data.username,
        role: userResponse.data.user_type,
      });

      // Inputlarni tozalash
      setUsername('');
      setPassword('');

      // Dashboardga yo'naltirish
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      if (error.response) {
        const errorMsg = error.response.data.detail || 'Username yoki parol noto‘g‘ri';
        setError(errorMsg);
      } else if (error.request) {
        setError('Server bilan bog‘lanishda xatolik yuz berdi');
      } else {
        setError('Noma’lum xatolik yuz berdi');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Xush kelibsiz!</h1>
          <p className="text-gray-600">Hisobingizga kiring</p>
          {error && <div className="mt-4 p-2 bg-red-100 text-red-600 rounded">{error}</div>}
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Foydalanuvchi nomi</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Foydalanuvchi nomini kiriting"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Parol</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Parolni kiriting"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isLoading}
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Eslab qolish
              </label>
            </div>
            <div className="text-sm">
              <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                Parolni unutdingizmi?
              </a>
            </div>
          </div>

          <button
            type="submit"
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Yuklanmoqda...' : 'Kirish'}
          </button>
        </form>
      </div>
    </div>
  );
}