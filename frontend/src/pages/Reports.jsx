import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Calendar, MapPin, Filter, FileSpreadsheet, TrendingUp, TrendingDown, Package, AlertTriangle, Loader2 } from 'lucide-react';
import transactionService from '../services/transactionService';
import reportService from '../services/reportService';
import categoryService from '../services/categoryService';
import warehouseService from '../services/warehouseService';
import productService from '../services/productService';
import { exportMultipleSheetsToExcel } from '../utils/exportUtils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

export default function Reports() {
  const [isLoading, setIsLoading] = useState(true);

  // Raw Data
  const [transactions, setTransactions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  // Filters
  const [dateFilterType, setDateFilterType] = useState('30_days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [importRes, exportRes, stockRes, catRes, whRes, prodRes] = await Promise.all([
          transactionService.getAllImports(),
          transactionService.getAllExports(),
          reportService.getAllStock(),
          categoryService.getAll(),
          warehouseService.getAll(),
          productService.getAll()
        ]);

        const imports = (importRes?.data || importRes || []).map(tx => ({ ...tx, type: 'IMPORT' }));
        const exports = (exportRes?.data || exportRes || []).map(tx => ({ ...tx, type: 'EXPORT' }));

        setTransactions([...imports, ...exports]);
        setInventory(stockRes?.data || stockRes || []);
        setCategories(catRes?.data || catRes || []);
        setWarehouses(whRes?.data || whRes || []);
        setProducts(prodRes?.data || prodRes || []);
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Helper Maps
  const catMap = useMemo(() => {
    const map = {};
    products.forEach(p => map[p.id] = p.categoryId);
    return map;
  }, [products]);

  const catNameMap = useMemo(() => {
    const map = {};
    categories.forEach(c => map[c.id] = c.name);
    return map;
  }, [categories]);

  const productPriceMap = useMemo(() => {
    const map = {};
    products.forEach(p => map[p.id] = p.price || 0);
    return map;
  }, [products]);

  // Derived / Filtered Data
  const { filteredTx, previousPeriodTx, filteredStock } = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    let endDate = new Date(now);
    
    let prevStartDate = new Date();
    let prevEndDate = new Date();

    if (dateFilterType === 'today') {
      prevStartDate.setDate(startDate.getDate() - 1);
      prevStartDate.setHours(0, 0, 0, 0);
      prevEndDate = new Date(prevStartDate);
      prevEndDate.setHours(23, 59, 59, 999);
    } else if (dateFilterType === '7_days') {
      startDate.setDate(now.getDate() - 7);
      prevEndDate = new Date(startDate);
      prevEndDate.setMilliseconds(-1);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevEndDate.getDate() - 7);
      prevStartDate.setHours(0, 0, 0, 0);
    } else if (dateFilterType === '30_days') {
      startDate.setDate(now.getDate() - 30);
      prevEndDate = new Date(startDate);
      prevEndDate.setMilliseconds(-1);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevEndDate.getDate() - 30);
      prevStartDate.setHours(0, 0, 0, 0);
    } else if (dateFilterType === 'this_month') {
      startDate.setDate(1);
      prevEndDate = new Date(startDate);
      prevEndDate.setMilliseconds(-1);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(1);
      prevStartDate.setHours(0, 0, 0, 0);
    } else if (dateFilterType === 'this_quarter') {
      const currentMonth = now.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      startDate.setMonth(quarterStartMonth, 1);
      
      prevEndDate = new Date(startDate);
      prevEndDate.setMilliseconds(-1);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setMonth(prevEndDate.getMonth() - 2, 1);
      prevStartDate.setHours(0, 0, 0, 0);
    } else if (dateFilterType === 'this_year') {
      startDate.setMonth(0, 1);
      prevEndDate = new Date(startDate);
      prevEndDate.setMilliseconds(-1);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setMonth(0, 1);
      prevStartDate.setHours(0, 0, 0, 0);
    } else if (dateFilterType === 'custom') {
      if (customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
        
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        prevEndDate = new Date(startDate);
        prevEndDate.setMilliseconds(-1);
        prevStartDate = new Date(prevEndDate);
        prevStartDate.setDate(prevEndDate.getDate() - diffDays + 1);
        prevStartDate.setHours(0, 0, 0, 0);
      }
    }

    const tx = [];
    const prevTx = [];

    transactions.forEach(t => {
      const txDate = new Date(t.createdAt);
      if (txDate >= startDate && txDate <= endDate) {
        tx.push(t);
      } else if (txDate >= prevStartDate && txDate <= prevEndDate) {
        prevTx.push(t);
      }
    });

    const stock = inventory.filter(item => {
      const catId = catMap[item.productId];
      if (selectedWarehouse && item.warehouseId.toString() !== selectedWarehouse) return false;
      if (selectedCategory && catId?.toString() !== selectedCategory) return false;
      return true;
    });

    return { filteredTx: tx, previousPeriodTx: prevTx, filteredStock: stock };
  }, [transactions, inventory, dateFilterType, customStartDate, customEndDate, selectedWarehouse, selectedCategory, catMap]);

  // Calculations
  const { totalImportQty, totalExportQty, topExported, importGrowth, exportGrowth, productReportData } = useMemo(() => {
    let importQty = 0;
    let exportQty = 0;
    let prevImportQty = 0;
    let prevExportQty = 0;
    const exportMap = {};
    const productReportMap = {};

    // Helper to calculate
    const processTx = (txList, isCurrentPeriod) => {
      txList.forEach(tx => {
        if (tx.status !== 'COMPLETED' && tx.status !== 'APPROVED') return;

        tx.details?.forEach(d => {
          const catId = catMap[d.productId];
          if (selectedWarehouse && tx.warehouseId?.toString() !== selectedWarehouse) return;
          if (selectedCategory && catId?.toString() !== selectedCategory) return;

          if (isCurrentPeriod) {
            // Initialize product in report map if not exists
            if (!productReportMap[d.productId]) {
              productReportMap[d.productId] = { 
                id: d.productId, 
                code: d.productCode, 
                name: d.productName, 
                importQty: 0, 
                exportQty: 0, 
                stockQty: 0 
              };
            }

            if (tx.type === 'IMPORT') {
              importQty += d.quantity;
              productReportMap[d.productId].importQty += d.quantity;
            } else if (tx.type === 'EXPORT') {
              exportQty += d.quantity;
              productReportMap[d.productId].exportQty += d.quantity;
              
              if (!exportMap[d.productId]) {
                exportMap[d.productId] = { id: d.productId, name: d.productName, code: d.productCode, qty: 0 };
              }
              exportMap[d.productId].qty += d.quantity;
            }
          } else {
            if (tx.type === 'IMPORT') prevImportQty += d.quantity;
            if (tx.type === 'EXPORT') prevExportQty += d.quantity;
          }
        });
      });
    };

    processTx(filteredTx, true);
    processTx(previousPeriodTx, false);

    // Calculate growth
    const calcGrowth = (current, prev) => {
      if (prev === 0) return current > 0 ? 100 : 0;
      return ((current - prev) / prev) * 100;
    };

    const impGrowth = calcGrowth(importQty, prevImportQty);
    const expGrowth = calcGrowth(exportQty, prevExportQty);

    const topExports = Object.values(exportMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

    // Merge current stock into product report
    filteredStock.forEach(item => {
      if (!productReportMap[item.productId]) {
         productReportMap[item.productId] = {
           id: item.productId,
           code: item.productCode || item.code || 'N/A',
           name: item.productName || item.name || 'N/A',
           importQty: 0,
           exportQty: 0,
           stockQty: 0
         };
      }
      productReportMap[item.productId].stockQty += item.quantity;
    });

    const reportDataArray = Object.values(productReportMap).sort((a, b) => a.code.localeCompare(b.code));

    return { 
      totalImportQty: importQty, 
      totalExportQty: exportQty, 
      topExported: topExports,
      importGrowth: impGrowth,
      exportGrowth: expGrowth,
      productReportData: reportDataArray
    };
  }, [filteredTx, previousPeriodTx, filteredStock, selectedWarehouse, selectedCategory, catMap]);

  const { currentTotalStock, currentTotalValue, lowStockItems, stockByCategory, topStockItems } = useMemo(() => {
    let total = 0;
    let value = 0;
    const low = [];
    const catTotalMap = {};

    filteredStock.forEach(item => {
      total += item.quantity;
      const price = productPriceMap[item.productId] || 0;
      value += item.quantity * price;

      if (item.quantity <= (item.minStockLevel || 0)) {
        low.push(item);
      }
      const catName = catNameMap[catMap[item.productId]] || 'Chưa phân loại';
      catTotalMap[catName] = (catTotalMap[catName] || 0) + item.quantity;
    });

    const pieData = Object.keys(catTotalMap).map(name => ({
      name,
      value: catTotalMap[name]
    })).filter(d => d.value > 0);

    // Sort low stock by urgency
    low.sort((a, b) => (a.quantity - a.minStockLevel) - (b.quantity - b.minStockLevel));

    const topStock = [...filteredStock].sort((a, b) => b.quantity - a.quantity).slice(0, 5);

    return { currentTotalStock: total, currentTotalValue: value, lowStockItems: low.slice(0, 5), stockByCategory: pieData, topStockItems: topStock };
  }, [filteredStock, catMap, catNameMap, productPriceMap]);

  const monthlyChartData = useMemo(() => {
    const monthsMap = {};
    const monthsList = [];

    // Generate last 6 months labels
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = `T${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`;
      monthsList.push(label);
      monthsMap[label] = { name: label, Nhập: 0, Xuất: 0 };
    }

    filteredTx.forEach(tx => {
      if (tx.status !== 'COMPLETED' && tx.status !== 'APPROVED') return;
      const d = new Date(tx.createdAt);
      const label = `T${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`;

      if (monthsMap[label]) {
        tx.details?.forEach(detail => {
          const catId = catMap[detail.productId];
          if (selectedWarehouse && tx.warehouseId?.toString() !== selectedWarehouse) return;
          if (selectedCategory && catId?.toString() !== selectedCategory) return;

          if (tx.type === 'IMPORT') monthsMap[label].Nhập += detail.quantity;
          if (tx.type === 'EXPORT') monthsMap[label].Xuất += detail.quantity;
        });
      }
    });

    return monthsList.map(label => monthsMap[label]);
  }, [filteredTx, selectedWarehouse, selectedCategory, catMap]);

  const handleExport = () => {
    const sheets = {
      'ChiTiet_NhapXuat': productReportData.map((item, idx) => ({
        'STT': idx + 1,
        'Mã SP': item.code,
        'Tên sản phẩm': item.name,
        'Tổng Nhập': item.importQty,
        'Tổng Xuất': item.exportQty,
        'Tồn kho HT': item.stockQty
      })),
      'Top_Xuat_Kho': topExported.map((item, idx) => ({
        'STT': idx + 1,
        'Mã SP': item.code,
        'Tên sản phẩm': item.name,
        'Số lượng xuất': item.qty
      })),
      'Top_Ton_Kho': topStockItems.map((item, idx) => ({
        'STT': idx + 1,
        'Mã SP': item.productCode || item.code,
        'Tên sản phẩm': item.productName || item.name,
        'Tồn HT': item.quantity
      })),
      'Canh_Bao_Ton_Thap': lowStockItems.map((item, idx) => ({
        'STT': idx + 1,
        'Mã SP': item.productCode || item.code,
        'Tên sản phẩm': item.productName || item.name,
        'Tồn HT': item.quantity,
        'Tối thiểu': item.minStockLevel || item.minStock || 0
      }))
    };

    exportMultipleSheetsToExcel(sheets, `BaoCao_ThongKe_${new Date().getTime()}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="animate-spin text-primary mb-4" size={40} />
        <p className="text-gray-500 font-medium">Đang tổng hợp dữ liệu thống kê...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Báo cáo - Thống kê</h1>
          <p className="text-gray-500 text-sm mt-1">Theo dõi số liệu nhập kho, xuất kho và tồn kho</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 rounded-lg font-medium transition shadow-sm text-sm"
          >
            <FileSpreadsheet size={18} />
            Xuất Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-gray-400" />
          <select
            value={dateFilterType}
            onChange={e => setDateFilterType(e.target.value)}
            className="border-gray-300 rounded-lg text-sm focus:ring-primary focus:border-primary border px-3 py-1.5"
          >
            <option value="today">Hôm nay</option>
            <option value="7_days">7 ngày qua</option>
            <option value="30_days">30 ngày qua</option>
            <option value="this_month">Tháng này</option>
            <option value="this_quarter">Quý này</option>
            <option value="this_year">Năm này</option>
            <option value="custom">Tùy chọn ngày</option>
          </select>
        </div>

        {dateFilterType === 'custom' && (
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={customStartDate} 
              onChange={e => setCustomStartDate(e.target.value)}
              className="border-gray-300 rounded-lg text-sm focus:ring-primary focus:border-primary border px-3 py-1.5"
            />
            <span className="text-gray-500">-</span>
            <input 
              type="date" 
              value={customEndDate} 
              onChange={e => setCustomEndDate(e.target.value)}
              className="border-gray-300 rounded-lg text-sm focus:ring-primary focus:border-primary border px-3 py-1.5"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-gray-400" />
          <select
            value={selectedWarehouse}
            onChange={e => setSelectedWarehouse(e.target.value)}
            className="border-gray-300 rounded-lg text-sm focus:ring-primary focus:border-primary border px-3 py-1.5"
          >
            <option value="">Tất cả kho hàng</option>
            {warehouses.filter(w => !w.name.includes('_deleted_') && w.isActive !== false).map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="border-gray-300 rounded-lg text-sm focus:ring-primary focus:border-primary border px-3 py-1.5"
          >
            <option value="">Tất cả danh mục</option>
            {categories.filter(c => !c.name.includes('_deleted_') && c.isActive !== false).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-lg"><TrendingUp size={24} className="text-blue-600" /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Tổng nhập (SP)</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-gray-800">{totalImportQty.toLocaleString()}</p>
              {importGrowth !== 0 && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${importGrowth > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {importGrowth > 0 ? '+' : ''}{importGrowth.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-lg"><TrendingDown size={24} className="text-emerald-600" /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Tổng xuất (SP)</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-gray-800">{totalExportQty.toLocaleString()}</p>
              {exportGrowth !== 0 && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${exportGrowth > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {exportGrowth > 0 ? '+' : ''}{exportGrowth.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-indigo-50 p-3 rounded-lg"><Package size={24} className="text-indigo-600" /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Tồn hiện tại</p>
            <p className="text-2xl font-bold text-gray-800">{currentTotalStock.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-lg"><span className="text-amber-600 font-bold text-xl">₫</span></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Giá trị tồn kho</p>
            <p className="text-xl font-bold text-gray-800">{currentTotalValue.toLocaleString()} ₫</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-rose-50 p-3 rounded-lg"><AlertTriangle size={24} className="text-rose-600" /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Sản phẩm tồn thấp</p>
            <p className="text-2xl font-bold text-rose-600">{lowStockItems.length}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Biểu đồ nhập - xuất 6 tháng gần nhất</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f3f4f6' }} />
                <Legend />
                <Bar dataKey="Nhập" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Xuất" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Tỷ trọng tồn kho theo danh mục</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {stockByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value.toLocaleString() + ' SP'} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-semibold text-gray-800">Top xuất nhiều nhất</h3>
          </div>
          <div className="overflow-x-auto w-full">
<table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 border-b">
              <tr>
                <th className="py-3 px-4 font-medium">Mã SP</th>
                <th className="py-3 px-4 font-medium">Tên sản phẩm</th>
                <th className="py-3 px-4 font-medium text-right">SL xuất</th>
              </tr>
            </thead>
            <tbody>
              {topExported.length > 0 ? topExported.slice(0, 5).map(item => (
                <tr key={item.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-700 truncate max-w-[80px]" title={item.code}>{item.code}</td>
                  <td className="py-3 px-4 truncate max-w-[150px]" title={item.name}>{item.name}</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-600">{item.qty.toLocaleString()}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="3" className="py-6 text-center text-gray-400">Không có dữ liệu</td>
                </tr>
              )}
            </tbody>
          </table>
</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-semibold text-gray-800">Top tồn kho cao nhất</h3>
          </div>
          <div className="overflow-x-auto w-full">
<table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 border-b">
              <tr>
                <th className="py-3 px-4 font-medium">Mã SP</th>
                <th className="py-3 px-4 font-medium">Tên sản phẩm</th>
                <th className="py-3 px-4 font-medium text-right">Tồn HT</th>
              </tr>
            </thead>
            <tbody>
              {topStockItems.length > 0 ? topStockItems.map(item => (
                <tr key={item.id} className="border-b last:border-b-0 hover:bg-blue-50/30">
                  <td className="py-3 px-4 font-medium text-gray-700 truncate max-w-[80px]" title={item.productCode || item.code}>{item.productCode || item.code}</td>
                  <td className="py-3 px-4 truncate max-w-[150px]" title={item.productName || item.name}>{item.productName || item.name}</td>
                  <td className="py-3 px-4 text-right font-bold text-blue-600">{item.quantity.toLocaleString()}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="3" className="py-6 text-center text-gray-400">Không có sản phẩm</td>
                </tr>
              )}
            </tbody>
          </table>
</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-semibold text-gray-800">Tồn kho thấp (dưới mức)</h3>
          </div>
          <div className="overflow-x-auto w-full">
<table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 border-b">
              <tr>
                <th className="py-3 px-4 font-medium">Mã SP</th>
                <th className="py-3 px-4 font-medium text-right">Tồn HT</th>
                <th className="py-3 px-4 font-medium text-right">Tối thiểu</th>
              </tr>
            </thead>
            <tbody>
              {lowStockItems.length > 0 ? lowStockItems.map(item => (
                <tr key={item.id} className="border-b last:border-b-0 hover:bg-red-50/30">
                  <td className="py-3 px-4 font-medium text-gray-700 truncate max-w-[100px]" title={item.productName || item.name}>{item.productCode || item.code}</td>
                  <td className="py-3 px-4 text-right font-bold text-rose-600">{item.quantity}</td>
                  <td className="py-3 px-4 text-right text-gray-500">{item.minStockLevel || item.minStock || 0}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="3" className="py-6 text-center text-gray-400">Không có cảnh báo</td>
                </tr>
              )}
            </tbody>
          </table>
</div>
        </div>
      </div>

      {/* Bảng Báo Cáo Nhập Xuất Theo Sản Phẩm */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">Báo cáo chi tiết Nhập - Xuất theo sản phẩm</h3>
          <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded">
            Dữ liệu theo kỳ báo cáo
          </span>
        </div>
        <div className="overflow-x-auto max-h-[500px]">
          <div className="overflow-x-auto w-full">
<table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 border-b sticky top-0 shadow-sm z-10">
              <tr>
                <th className="py-3 px-4 font-medium whitespace-nowrap">Mã SP</th>
                <th className="py-3 px-4 font-medium">Tên sản phẩm</th>
                <th className="py-3 px-4 font-medium text-right whitespace-nowrap">Tổng Nhập</th>
                <th className="py-3 px-4 font-medium text-right whitespace-nowrap">Tổng Xuất</th>
                <th className="py-3 px-4 font-medium text-right whitespace-nowrap">Tồn kho hiện tại</th>
              </tr>
            </thead>
            <tbody>
              {productReportData.length > 0 ? productReportData.map(item => (
                <tr key={item.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-700 whitespace-nowrap">{item.code}</td>
                  <td className="py-3 px-4 min-w-[200px]">{item.name}</td>
                  <td className="py-3 px-4 text-right font-medium text-blue-600">{item.importQty.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-medium text-emerald-600">{item.exportQty.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-bold text-gray-800">{item.stockQty.toLocaleString()}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-400">Không có dữ liệu trong thời gian này</td>
                </tr>
              )}
            </tbody>
          </table>
</div>
        </div>
      </div>
    </div>
  );
}
