import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import dashboardService from '../services/dashboardService';

const chartData = [
  { name: 'Tháng 1', stock: 4000 },
  { name: 'Tháng 2', stock: 3000 },
  { name: 'Tháng 3', stock: 2000 },
  { name: 'Tháng 4', stock: 2780 },
  { name: 'Tháng 5', stock: 1890 },
  { name: 'Tháng 6', stock: 2390 },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalLowStock: 0,
    detailsLowStock: [],
    importsThisMonth: 0,
    exportsThisMonth: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchOverview = async () => {
      setIsLoading(true);
      try {
        const data = await dashboardService.getOverview();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOverview();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Tổng quan</h1>
          <p className="text-gray-500 mt-1">Tổng quan tình hình kho hàng hiện tại</p>
        </div>
        
        {/* Thao tác nhanh */}
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => navigate('/import')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-medium transition-colors shadow-sm border border-blue-200"
          >
            <ArrowDownToLine size={18} />
            Tạo phiếu nhập
          </button>
          
          <button 
            onClick={() => navigate('/export')}
            className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg font-medium transition-colors shadow-sm border border-purple-200"
          >
            <ArrowUpFromLine size={18} />
            Tạo phiếu xuất
          </button>
          
          <button 
            onClick={() => navigate('/products')}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-medium transition-colors shadow-sm border border-emerald-200"
          >
            <Package size={18} />
            Sản phẩm mới
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-full">
            <Package size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">Tổng Sản Phẩm</p>
            <p className="text-2xl font-bold text-gray-800">
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : stats.totalProducts}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm flex items-center gap-4 border border-orange-100">
          <div className="p-4 bg-orange-50 text-orange-500 rounded-full">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">Cảnh Báo Tồn Thấp</p>
            <p className="text-2xl font-bold text-orange-600">
              {isLoading ? <Loader2 className="animate-spin text-orange-400" size={24} /> : stats.totalLowStock}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full">
            <ArrowDownToLine size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">Nhập 30 Ngày Qua</p>
            <p className="text-2xl font-bold text-gray-800">
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : stats.importsThisMonth}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-full">
            <ArrowUpFromLine size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">Xuất 30 Ngày Qua</p>
            <p className="text-2xl font-bold text-gray-800">
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : stats.exportsThisMonth}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Xu Hướng Tồn Kho</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} />
                <Bar dataKey="stock" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Table */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-red-50">
          <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={20} />
            Sắp Hết Hàng
          </h2>
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="animate-spin text-primary" size={32} />
              </div>
            ) : stats.detailsLowStock.length > 0 ? (
              <>
                 {stats.detailsLowStock.map((item, index) => {
                   const isOutOfStock = item.quantity === 0;
                   const minStock = item.minStockLevel || 10;
                   const percent = Math.min(100, Math.max(0, (item.quantity / minStock) * 100));

                   return (
                   <div key={index} className="flex flex-col gap-3 p-4 mb-3 hover:bg-gray-50/80 rounded-xl transition-all border border-gray-100 bg-white hover:shadow-md group">
                     {/* Info & Progress */}
                     <div className="flex justify-between items-start">
                       <div className="flex gap-3">
                         {/* Avatar / Icon */}
                         <div className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm
                           ${isOutOfStock ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                           {item.productName.charAt(0).toUpperCase()}
                         </div>
                         <div>
                           <h4 className="font-bold text-gray-800 text-sm group-hover:text-primary transition-colors line-clamp-1">{item.productName}</h4>
                           <p className="text-xs text-gray-500 font-medium">{item.productCode}</p>
                         </div>
                       </div>
                       
                       <div className="text-right">
                         <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold shadow-sm
                           ${isOutOfStock ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>
                           {isOutOfStock ? 'Hết hàng' : `Còn: ${item.quantity}`}
                         </span>
                       </div>
                     </div>
                     
                     <div className="flex items-center gap-3 mt-1">
                       <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                         <div 
                           className={`h-full rounded-full transition-all duration-1000 ${isOutOfStock ? 'bg-red-500' : 'bg-orange-500'}`}
                           style={{ width: `${percent}%` }}
                         ></div>
                       </div>
                       <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">
                         Mức tối thiểu: {minStock}
                       </span>
                     </div>

                     {/* Quick Action Button */}
                     <div className="mt-1 flex justify-end">
                       <button
                         onClick={() => navigate('/import', { state: { productId: item.productId } })}
                         className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium border shadow-sm ${
                           isOutOfStock
                             ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'
                             : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-200'
                         }`}
                       >
                         <ArrowDownToLine size={14} /> 
                         {isOutOfStock ? 'Nhập khẩn cấp' : 'Nhập thêm'}
                       </button>
                     </div>
                   </div>
                 )})}
                <button
                  onClick={() => navigate('/reports')}
                  className="w-full mt-4 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-100 hover:bg-blue-50 rounded-lg transition font-medium"
                >
                  Xem tất cả
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Tất cả sản phẩm đều ở mức tồn kho an toàn.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
