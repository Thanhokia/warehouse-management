import React, { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import reportService from '../../services/reportService';
import toast from 'react-hot-toast';

export default function MainLayout() {
  const notifiedProductsRef = useRef(new Set());

  useEffect(() => {
    const checkLowStock = async () => {
      try {
        const response = await reportService.getLowStock();
        const lowStockItems = response?.data || (Array.isArray(response) ? response : []);
        
        lowStockItems.forEach(item => {
          if (!notifiedProductsRef.current.has(item.productId)) {
            notifiedProductsRef.current.add(item.productId);
            const message = item.quantity === 0 
              ? `Cảnh báo: Sản phẩm "${item.productName}" ĐÃ HẾT HÀNG!`
              : `Cảnh báo: Sản phẩm "${item.productName}" sắp hết hàng (chỉ còn ${item.quantity})!`;
            toast.error(message, { duration: 6000, icon: '⚠️' });
          }
        });
      } catch (error) {
        // Silently ignore polling errors
      }
    };

    // Kiểm tra ngay khi vừa load app
    checkLowStock();

    // Thiết lập tự động kiểm tra mỗi 30 giây (Realtime Polling)
    const intervalId = setInterval(checkLowStock, 30000);

    return () => clearInterval(intervalId);
  }, []);

  return (
      <div className="min-h-screen bg-bg flex">
      <Sidebar />
      <div className="flex-1 ml-64 p-4 lg:p-8">
        <Outlet />
      </div>
    </div>
  );
}
