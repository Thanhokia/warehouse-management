import React, { useState, useEffect } from 'react';
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
      <div>
        <h1 className="text-2xl font-bold text-primary">Tổng quan</h1>
        <p className="text-gray-500 mt-1">Tổng quan tình hình kho hàng hiện tại</p>
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
            <p className="text-gray-500 text-sm font-medium">Nhập Trong Tháng</p>
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
            <p className="text-gray-500 text-sm font-medium">Xuất Trong Tháng</p>
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
                 {stats.detailsLowStock.map((item, index) => (
                   <div key={index} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg transition border border-gray-100">
                     <div>
                       <p className="font-semibold text-sm text-gray-800">{item.productCode}</p>
                       <p className="text-xs text-gray-500">{item.productName}</p>
                     </div>
                     <div className="text-right">
                       <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${item.quantity === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                         Còn: {item.quantity}
                       </span>
                     </div>
                   </div>
                 ))}
                 <button className="w-full mt-4 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-100 hover:bg-blue-50 rounded-lg transition font-medium">
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
