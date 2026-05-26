import React, { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import reportService from '../../services/reportService';
import toast from 'react-hot-toast';

export default function MainLayout() {
  const notifiedProductsRef = useRef(new Map());

  useEffect(() => {
    const checkLowStock = async () => {
      try {
        const response = await reportService.getLowStock();
        const lowStockItems = response?.data || (Array.isArray(response) ? response : []);
        
        lowStockItems.forEach(item => {
          const currentQty = Number(item.quantity);
          const key = `${item.warehouseId}-${item.productId}`;
          const prevQuantity = notifiedProductsRef.current.get(key);
          
          // Notify if we have never seen it OR if the quantity just decreased further
          if (prevQuantity === undefined || currentQty < prevQuantity) {
            notifiedProductsRef.current.set(key, currentQty);
            const message = currentQty === 0 
              ? `Cảnh báo: Sản phẩm "${item.productName}" ĐÃ HẾT HÀNG!`
              : `Cảnh báo: Sản phẩm "${item.productName}" sắp hết hàng (chỉ còn ${currentQty})!`;
              
            toast.error(message, { 
              duration: 8000, 
              icon: '⚠️',
              id: `low-stock-${key}-${currentQty}`, // Prevent duplicate toasts
              style: {
                border: '1px solid #FFB020',
                padding: '16px',
                color: '#B7791F',
                backgroundColor: '#FFFAF0',
                maxWidth: '500px'
              }
            });
          } else if (currentQty > prevQuantity) {
            // Just update the map if stock went up but is still below minimum
            notifiedProductsRef.current.set(key, currentQty);
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

    // Lắng nghe event khi có giao dịch được duyệt để kiểm tra ngay (có delay nhỏ để chờ DB update)
    const handleTransaction = () => {
      setTimeout(checkLowStock, 800);
    };
    window.addEventListener('transaction_completed', handleTransaction);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('transaction_completed', handleTransaction);
    };
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg flex flex-col lg:flex-row">
      {/* Mobile Topbar */}
      <div className="lg:hidden bg-primary text-white p-4 flex justify-between items-center shadow-md z-20">
        <div className="flex items-center gap-3">
          <img src="/logo.png.jpg" alt="Logo" className="w-8 h-8 rounded-full border border-white/20" />
          <h2 className="text-lg font-bold uppercase tracking-wider">ZôZô Quán</h2>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-1 focus:outline-none">
          <Menu size={24} />
        </button>
      </div>

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 lg:ml-64 p-4 lg:p-8 w-full overflow-x-hidden">
        <Outlet />
      </div>
    </div>
  );
}
