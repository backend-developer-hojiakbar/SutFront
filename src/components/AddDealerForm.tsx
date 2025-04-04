import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DealerFormProps {
  onSave: (dealer: { 
    name: string; 
    phone: string; 
    address: string; 
    status: 'active' | 'inactive';
    tradeLicense: string;
    taxInfo: string;
  }) => void;
  onCancel: () => void;
}

const AddDealerForm: React.FC<DealerFormProps> = ({ onSave, onCancel }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [tradeLicense, setTradeLicense] = useState('');
  const [taxInfo, setTaxInfo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ 
      name, 
      phone, 
      address, 
      status,
      tradeLicense,
      taxInfo
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('dealer.name')}
        </label>
        <input
          type="text"
          className="w-full p-2 border border-gray-300 rounded-md"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('dealer.phone')}
        </label>
        <input
          type="text"
          className="w-full p-2 border border-gray-300 rounded-md"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('dealer.address')}
        </label>
        <input
          type="text"
          className="w-full p-2 border border-gray-300 rounded-md"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('dealer.status')}
        </label>
        <select
          className="w-full p-2 border border-gray-300 rounded-md"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
        >
          <option value="active">{t('dealer.active')}</option>
          <option value="inactive">{t('dealer.inactive')}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('dealer.tradeLicense')}
          </label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={tradeLicense}
            onChange={(e) => setTradeLicense(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('dealer.taxInfo')}
          </label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={taxInfo}
            onChange={(e) => setTaxInfo(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md">
          {t('common.save')}
        </button>
        <button 
          type="button" 
          onClick={onCancel} 
          className="ml-2 bg-gray-500 text-white px-4 py-2 rounded-md"
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
};

export default AddDealerForm;
