import React, { useState, useEffect } from 'react';
import { User, Database, Shield, Trash2, Edit } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

const BASE_URL = 'https://lemoonapi.cdpos.uz:444/';

const SettingsPage: React.FC = () => {
  const { token, user } = useAuthStore();
  const [userData, setUserData] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editUnitId, setEditUnitId] = useState<number | null>(null);
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [newUnitName, setNewUnitName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const apiConfig = {
    headers: { Authorization: `JWT ${token}` },
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setError('Autentifikatsiya tokeni topilmadi.');
        setLoading(false);
        return;
      }

      try {
        const userRes = await axios.get(`${BASE_URL}users/current_user/`, apiConfig);
        setUserData(userRes.data);

        if (user?.role === 'admin' || user?.role === 'omborchi') {
          const unitsRes = await axios.get(`${BASE_URL}birliklar/`, apiConfig);
          setUnits(unitsRes.data.results || unitsRes.data);

          const categoriesRes = await axios.get(`${BASE_URL}kategoriyalar/`, apiConfig);
          setCategories(categoriesRes.data.results || categoriesRes.data);
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Ma\'lumotlarni yuklashda xatolik');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, user]);

  const handleUserUpdate = async () => {
    if (!userData) return;
    try {
      const response = await axios.put(`${BASE_URL}users/${userData.id}/`, userData, apiConfig);
      setUserData(response.data);
      alert('Ma\'lumotlar muvaffaqiyatli yangilandi');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ma\'lumotlarni yangilashda xatolik');
    }
  };

  const handlePasswordUpdate = async () => {
    if (newPassword !== confirmPassword) {
      setError('Parollar mos kelmaydi');
      return;
    }
    if (!newPassword) {
      setError('Yangi parol kiritilmadi');
      return;
    }

    try {
      const passwordData = {
        password: newPassword,
      };
      await axios.put(`${BASE_URL}users/${userData.id}/`, { ...userData, ...passwordData }, apiConfig);
      setNewPassword('');
      setConfirmPassword('');
      alert('Parol muvaffaqiyatli yangilandi');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Parolni yangilashda xatolik');
    }
  };

  const handleUnitUpdate = async (unitId: number) => {
    try {
      const response = await axios.put(`${BASE_URL}birliklar/${unitId}/`, { name: newUnitName }, apiConfig);
      setUnits(units.map(u => (u.id === unitId ? response.data : u)));
      setEditUnitId(null);
      setNewUnitName('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Birlikni yangilashda xatolik');
    }
  };

  const handleCategoryUpdate = async (categoryId: number) => {
    try {
      const response = await axios.put(`${BASE_URL}kategoriyalar/${categoryId}/`, { name: newCategoryName }, apiConfig);
      setCategories(categories.map(c => (c.id === categoryId ? response.data : c)));
      setEditCategoryId(null);
      setNewCategoryName('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Kategoriyani yangilashda xatolik');
    }
  };

  const handleUnitDelete = async (unitId: number) => {
    if (window.confirm('Bu birlikni o‘chirishni xohlaysizmi?')) {
      try {
        await axios.delete(`${BASE_URL}birliklar/${unitId}/`, apiConfig);
        setUnits(units.filter(u => u.id !== unitId));
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Birlikni o‘chirishda xatolik');
      }
    }
  };

  const handleCategoryDelete = async (categoryId: number) => {
    if (window.confirm('Bu kategoriyani o‘chirishni xohlaysizmi?')) {
      try {
        await axios.delete(`${BASE_URL}kategoriyalar/${categoryId}/`, apiConfig);
        setCategories(categories.filter(c => c.id !== categoryId));
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Kategoriyani o‘chirishda xatolik');
      }
    }
  };

  if (loading) return <div className="p-6">Yuklanmoqda...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <style>
        {`
          .settings-container { width: 100%; max-width: 100%; margin: 0; padding: 20px; }
          .settings-card { width: 100%; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden; }
          .settings-header { padding: 24px; border-bottom: 1px solid #e5e7eb; }
          .settings-content { padding: 24px; }
          .section-title { font-size: 1.125rem; font-weight: 500; color: #1f2937; display: flex; align-items: center; margin-bottom: 16px; }
          .input-field { width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; margin-top: 4px; }
          .save-button { padding: 8px 16px; background-color: #2563eb; color: white; border-radius: 4px; border: none; cursor: pointer; }
          .save-button:hover { background-color: #1d4ed8; }
          .edit-delete-buttons { display: flex; gap: 8px; }
          .edit-button, .delete-button { cursor: pointer; }
          .edit-button:hover { color: #1d4ed8; }
          .delete-button:hover { color: #dc2626; }
        `}
      </style>
      <div className="settings-container">
        <div className="settings-card">
          <div className="settings-header">
            <h2 className="text-lg font-medium text-gray-900">Sozlamalar</h2>
            <p className="mt-1 text-sm text-gray-500">Hisobingiz sozlamalari va afzalliklarini boshqaring</p>
          </div>

          <div className="settings-content space-y-6">
            {/* Profil sozlamalari */}
            <div>
              <h3 className="section-title">
                <User className="h-5 w-5 mr-2" /> Profil Sozlamalari
              </h3>
              {userData && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Foydalanuvchi nomi</label>
                    <input
                      type="text"
                      value={userData.username || ''}
                      onChange={(e) => setUserData({ ...userData, username: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={userData.email || ''}
                      onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ism</label>
                    <input
                      type="text"
                      value={userData.first_name || ''}
                      onChange={(e) => setUserData({ ...userData, first_name: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Familiya</label>
                    <input
                      type="text"
                      value={userData.last_name || ''}
                      onChange={(e) => setUserData({ ...userData, last_name: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Foydalanuvchi turi</label>
                    <input
                      type="text"
                      value={userData.user_type || ''}
                      onChange={(e) => setUserData({ ...userData, user_type: e.target.value })}
                      className="input-field"
                      disabled
                    />
                  </div>
                  <button onClick={handleUserUpdate} className="save-button">
                    Saqlash
                  </button>

                  {/* Parol yangilash */}
                  <div className="mt-6">
                    <h4 className="text-md font-medium text-gray-700 mb-2">Parolni yangilash</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Yangi parol</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Parolni tasdiqlash</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="input-field"
                        />
                      </div>
                      <button onClick={handlePasswordUpdate} className="save-button">
                        Parolni yangilash
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Birliklar - faqat admin va omborchi uchun */}
            {(user?.role === 'admin' || user?.role === 'omborchi') && (
              <div>
                <h3 className="section-title">
                  <Database className="h-5 w-5 mr-2" /> Birliklar
                </h3>
                <div className="space-y-2">
                  {units.map((unit) => (
                    <div key={unit.id} className="flex items-center justify-between">
                      {editUnitId === unit.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newUnitName}
                            onChange={(e) => setNewUnitName(e.target.value)}
                            className="input-field"
                          />
                          <button
                            onClick={() => handleUnitUpdate(unit.id)}
                            className="save-button"
                          >
                            Saqlash
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-700">{unit.name}</span>
                      )}
                      <div className="edit-delete-buttons">
                        <button
                          onClick={() => {
                            setEditUnitId(unit.id);
                            setNewUnitName(unit.name);
                          }}
                          className="edit-button text-blue-600"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleUnitDelete(unit.id)}
                          className="delete-button text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Kategoriyalar - faqat admin va omborchi uchun */}
            {(user?.role === 'admin' || user?.role === 'omborchi') && (
              <div>
                <h3 className="section-title">
                  <Shield className="h-5 w-5 mr-2" /> Kategoriyalar
                </h3>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between">
                      {editCategoryId === category.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className="input-field"
                          />
                          <button
                            onClick={() => handleCategoryUpdate(category.id)}
                            className="save-button"
                          >
                            Saqlash
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-700">{category.name}</span>
                      )}
                      <div className="edit-delete-buttons">
                        <button
                          onClick={() => {
                            setEditCategoryId(category.id);
                            setNewCategoryName(category.name);
                          }}
                          className="edit-button text-blue-600"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleCategoryDelete(category.id)}
                          className="delete-button text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;