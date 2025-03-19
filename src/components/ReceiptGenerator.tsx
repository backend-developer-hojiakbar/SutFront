import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const generateQR = async (text: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(text, {
      width: 128,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error(err);
    return '';
  }
};




interface QRCodeProps {
  value: string;
  size?: number;
  qrStyle?: 'squares' | 'dots';
  eyeRadius?: number;
  bgColor?: string;
  fgColor?: string;
}










interface ReceiptProps {
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  total: number;
  paymentMethod: string;
  currency: string;
  timestamp: string;
  dealer: {
    id: number;
    name: string;
    phone: string;
    address: string;
  } | null;
  shop: {
    id: number;
    name: string;
    location: string;
  } | null;
}

export const ReceiptGenerator: React.FC<ReceiptProps> = ({
  items,
  total,
  paymentMethod,
  currency,
  timestamp,
  dealer,
  shop
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    const generateQrCode = async () => {
      const url = await generateQR(JSON.stringify({
        items,
        total,
        paymentMethod,
        currency,
        timestamp
      }));
      setQrCodeUrl(url);
    };

    generateQrCode();
  }, [items, total, paymentMethod, currency, timestamp]);

  const receiptData = JSON.stringify({
    items,
    total,
    paymentMethod,
    currency,
    timestamp
  });

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-80">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold">Receipt</h2>
        <p className="text-sm text-gray-500">Thank you for your purchase!</p>
      </div>
      
      <div className="space-y-2 mb-4">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between">
            <div>
              <span className="font-medium">{item.name}</span>
              <span className="text-sm text-gray-500 ml-2">x{item.quantity}</span>
            </div>
            <span>{item.total.toFixed(2)} {currency}</span>
          </div>
        ))}
      </div>

      <div className="border-t pt-4 mb-4">
        <div className="flex justify-between font-medium">
          <span>Total:</span>
          <span>{total.toFixed(2)} {currency}</span>
        </div>
        <div className="text-sm text-gray-500 mt-1">
          Payment Method: {paymentMethod}
        </div>
        {dealer && (
          <div className="mt-2">
            <div className="text-sm font-medium">Dealer:</div>
            <div className="text-sm text-gray-500">
              {dealer.name} - {dealer.phone}
            </div>
            <div className="text-sm text-gray-500">
              {dealer.address}
            </div>
          </div>
        )}
        {shop && (
          <div className="mt-2">
            <div className="text-sm font-medium">Shop:</div>
            <div className="text-sm text-gray-500">
              {shop.name} - {shop.location}
            </div>
          </div>
        )}
      </div>

      <div className="text-center mt-4">
        {qrCodeUrl && (
          <img 
            src={qrCodeUrl}
            alt="QR Code" 
            width={128}
            height={128}
          />
        )}











        <p className="text-xs text-gray-500 mt-2">
          Scan to verify receipt
        </p>
      </div>

      <div className="text-center text-xs text-gray-500 mt-4">
        {new Date(timestamp).toLocaleString()}
      </div>
    </div>
  );
};

export const RecentSales = ({ sales }: { sales: ReceiptProps[] }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-medium mb-4">Recent Sales</h3>
      <div className="space-y-4">
        {sales.length === 0 ? (
          <div className="text-gray-500">No recent sales</div>
        ) : (
          sales.map((sale, index) => (
            <div key={index} className="border-b pb-4">
              <div className="flex justify-between">
                <span>{new Date(sale.timestamp).toLocaleTimeString()}</span>
                <span className="font-medium">
                  {sale.total.toFixed(2)} {sale.currency}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {sale.items.length} items, {sale.paymentMethod}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
