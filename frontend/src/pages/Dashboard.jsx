import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import dashboardService from '../services/dashboardService';



const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg min-w-[120px]">
        <p className="font-semibold text-gray-800 mb-2">{label}</p>
        <p className="text-[#1e3a8a] text-sm mb-1 font-medium">Nhập hàng : {data.imports}</p>
        <p className="text-[#60a5fa] text-sm mb-1 font-medium">Xuất hàng : {data.exports}</p>
        <p className="text-gray-600 text-sm font-medium">Tồn kho : {data.stock}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalLowStock: 0,
    detailsLowStock: [],
    importsThisMonth: 0,
    exportsThisMonth: 0,
    topExportProducts: [],
  });
  const [trendData, setTrendData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [overviewRes, trendRes] = await Promise.all([
          dashboardService.getOverview(),
          dashboardService.getInventoryTrend()
        ]);
        setStats(overviewRes);
        if (trendRes && trendRes.data) {
          setTrendData(trendRes.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
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
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white hover:bg-primary-dark rounded-lg font-medium transition-colors shadow-sm"
          >
            <ArrowDownToLine size={18} />
            Tạo phiếu nhập
          </button>

          <button
            onClick={() => navigate('/export')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white hover:bg-primary-dark rounded-lg font-medium transition-colors shadow-sm"
          >
            <ArrowUpFromLine size={18} />
            Tạo phiếu xuất
          </button>

          <button
            onClick={() => navigate('/products')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white hover:bg-primary-dark rounded-lg font-medium transition-colors shadow-sm"
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
            <p className="text-gray-500 text-sm font-medium">Tổng sản phẩm</p>
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
            <p className="text-gray-500 text-sm font-medium">Cảnh báo tồn thấp</p>
            <p className="text-2xl font-bold text-orange-600">
              {isLoading ? <Loader2 className="animate-spin text-orange-400" size={24} /> : stats.totalLowStock}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-full">
            <ArrowDownToLine size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">Nhập 30 ngày qua</p>
            <p className="text-2xl font-bold text-gray-800">
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : stats.importsThisMonth}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-full">
            <ArrowUpFromLine size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">Xuất 30 ngày qua</p>
            <p className="text-2xl font-bold text-gray-800">
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : stats.exportsThisMonth}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800">Xu hướng nhập - xuất kho</h2>
              <p className="text-sm text-gray-500 mt-1">Thống kê số lượng hàng hóa nhập và xuất trong từng tháng</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F3F4F6' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="square" />
                  <Bar dataKey="imports" name="Nhập hàng" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="exports" name="Xuất hàng" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Exported Products */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-50">
            <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <ArrowUpFromLine className="text-blue-500" size={20} />
              Top sản phẩm xuất kho nhiều nhất (30 ngày)
            </h2>
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="animate-spin text-primary" size={32} />
                </div>
              ) : stats.topExportProducts && stats.topExportProducts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.topExportProducts.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold group-hover:bg-blue-100 transition-colors">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800 text-sm line-clamp-1 group-hover:text-blue-700 transition-colors">{item.productName}</h4>
                          <p className="text-xs text-gray-500 font-medium">{item.productCode}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gray-800 text-lg">{item.totalQuantity}</span>
                        <span className="text-xs text-gray-500 font-medium ml-1">{item.productUnit || 'sp'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Chưa có dữ liệu xuất kho trong 30 ngày qua.</p>
              )}
            </div>
          </div>
        </div>

        {/* Low Stock Table */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-red-50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={20} />
              Cảnh báo tồn kho
            </h2>
            <span className="bg-orange-100 text-orange-600 text-sm font-bold px-2.5 py-0.5 rounded-full">
              {stats.totalLowStock}
            </span>
          </div>
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="animate-spin text-primary" size={32} />
              </div>
            ) : stats.detailsLowStock.length > 0 ? (
              <>
                {stats.detailsLowStock.slice(0, 4).map((item, index) => {
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
                          className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium border shadow-sm ${isOutOfStock
                            ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'
                            : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-200'
                            }`}
                        >
                          <ArrowDownToLine size={14} />
                          {isOutOfStock ? 'Nhập khẩn cấp' : 'Nhập thêm'}
                        </button>
                      </div>
                    </div>
                  )
                })}
                <button
                  onClick={() => navigate('/inventory')}
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
