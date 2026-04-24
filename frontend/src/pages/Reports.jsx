import React, { useState, useEffect } from 'react';
import { Search, Filter, AlertTriangle, Package, MapPin, CheckCircle, Loader2 } from 'lucide-react';
import reportService from '../services/reportService';
import categoryService from '../services/categoryService';
import warehouseService from '../services/warehouseService';
import productService from '../services/productService';
import Pagination from '../components/common/Pagination';

export default function Reports() {
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [productCatMap, setProductCatMap] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [stockRes, catRes, whRes, prodRes] = await Promise.all([
        reportService.getAllStock(),
        categoryService.getAll(),
        warehouseService.getAll(),
        productService.getAll()
      ]);

      const fetchedCategories = catRes?.data || (Array.isArray(catRes) ? catRes : []);
      const fetchedWarehouses = whRes?.data || (Array.isArray(whRes) ? whRes : []);
      const fetchedProducts = prodRes?.data || (Array.isArray(prodRes) ? prodRes : []);
      const fetchedStock = stockRes?.data || (Array.isArray(stockRes) ? stockRes : []);

      setCategories(fetchedCategories);
      setWarehouses(fetchedWarehouses);

      const catMap = {};
      fetchedProducts.forEach(p => {
        catMap[p.id] = p.categoryId;
      });
      setProductCatMap(catMap);

      const formattedStock = fetchedStock.map(item => ({
        id: item.id,
        code: item.productCode,
        name: item.productName,
        productId: item.productId,
        categoryId: catMap[item.productId],
        warehouseId: item.warehouseId,
        warehouseName: item.warehouseName,
        unit: item.productUnit,
        stock: item.quantity,
        minStock: item.minStockLevel || 0
      }));

      setInventory(formattedStock);

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Lọc dữ liệu
  const filteredInventory = inventory.filter(item => {
    const matchName = item.name.toLowerCase().includes(search.toLowerCase()) || item.code.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter ? item.categoryId.toString() === categoryFilter : true;
    const matchWarehouse = warehouseFilter ? item.warehouseId.toString() === warehouseFilter : true;
    return matchName && matchCategory && matchWarehouse;
  });

  // Tìm các sản phẩm sắp hết hàng (hoặc đã hết) trong list đang lọc
  const lowStockItems = filteredInventory.filter(item => item.stock <= item.minStock);

  const totalPages = Math.ceil(filteredInventory.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedInventory = filteredInventory.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, warehouseFilter]);

  const getCategoryName = (id) => categories.find(c => c.id === id)?.name || 'N/A';
  const getWarehouseName = (id) => warehouses.find(w => w.id === id)?.name || 'N/A';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Báo Cáo Tồn Kho</h1>
          <p className="text-gray-500 text-sm mt-1">Theo dõi số lượng hàng hóa và tình trạng cảnh báo</p>
        </div>
      </div>

      {/* Low Stock Warning Section */}
      <div className="bg-white rounded-lg shadow-sm border border-orange-200 overflow-hidden">
        <div className="bg-orange-50 px-5 py-3 border-b border-orange-100 flex items-center gap-2">
          <AlertTriangle className="text-orange-500" size={20} />
          <h2 className="text-lg font-medium text-orange-800">Cảnh báo tồn kho thấp sắp hết</h2>
          <span className="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-0.5 rounded-full ml-2">
            {lowStockItems.length}
          </span>
        </div>
        
        <div className="p-5">
          {lowStockItems.length > 0 ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStockItems.map(item => (
                <div key={item.id} className="border border-red-100 bg-red-50/30 rounded p-3 flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-800">{item.code} - {item.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <MapPin size={12} /> {getWarehouseName(item.warehouseId)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-red-600">{item.stock}</div>
                    <div className="text-xs text-gray-500">Mức tối thiểu: {item.minStock}</div>
                  </div>
                </div>
              ))}
           </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-gray-500">
              <CheckCircle className="text-green-500 mb-2" size={32} />
              <p>Hệ thống hiện không có sản phẩm nào sắp hết hàng (dưới mức tối thiểu) trong bộ lọc này.</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Inventory Table Section */}
      <div className="bg-surface rounded-lg shadow">
        <div className="p-5 border-b">
          <div className="flex flex-col lg:flex-row gap-4 justify-between">
            <h2 className="text-lg font-medium text-primary flex items-center gap-2">
              <Package size={20} />
              Bảng tồn kho hiện tại
            </h2>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative min-w-[200px]">
                <input 
                  type="text" 
                  placeholder="Tìm mã hoặc tên SP..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border rounded focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                />
                <Search className="absolute left-3 top-2 text-gray-400" size={16} />
              </div>

              <div className="relative min-w-[150px]">
                <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border rounded focus:ring-2 focus:ring-primary focus:outline-none text-sm appearance-none bg-white"
                >
                  <option value="">Tất cả danh mục</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <Filter className="absolute left-2.5 top-2 text-gray-400" size={16} />
              </div>

              <div className="relative min-w-[150px]">
                <select 
                  value={warehouseFilter}
                  onChange={(e) => setWarehouseFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border rounded focus:ring-2 focus:ring-primary focus:outline-none text-sm appearance-none bg-white"
                >
                  <option value="">Tất cả kho hàng</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
                <MapPin className="absolute left-2.5 top-2 text-gray-400" size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto p-5">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-y">
                <th className="text-left py-3 px-4 text-gray-600 font-medium whitespace-nowrap">Mã SP</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium min-w-[200px]">Tên Sản phẩm</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Danh mục</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Kho bảo quản</th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium">Đơn vị</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium">Tồn kho</th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium">Tình trạng</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="text-center py-10">
                    <Loader2 className="animate-spin text-primary mx-auto mb-2" size={32} />
                    <p className="text-gray-500">Đang tải báo cáo tồn kho...</p>
                  </td>
                </tr>
              ) : paginatedInventory.length > 0 ? (
                paginatedInventory.map((item) => {
                  const isLowStock = item.stock <= item.minStock;
                  return (
                    <tr key={item.id} className={`border-b transition hover:bg-gray-50 ${isLowStock ? 'bg-red-50/20' : ''}`}>
                      <td className="py-3 px-4 font-medium text-gray-700">{item.code}</td>
                      <td className="py-3 px-4 font-semibold text-primary">{item.name}</td>
                      <td className="py-3 px-4 text-gray-600">{getCategoryName(item.categoryId)}</td>
                      <td className="py-3 px-4 text-gray-600">{getWarehouseName(item.warehouseId)}</td>
                      <td className="py-3 px-4 text-center text-gray-600">{item.unit}</td>
                      <td className={`py-3 px-4 text-right font-bold ${isLowStock ? 'text-red-600' : 'text-gray-700'}`}>
                        {item.stock}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isLowStock ? (
                           <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded">
                             <AlertTriangle size={12} /> Thiếu hàng
                           </span>
                        ) : (
                           <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded">
                             Ổn định
                           </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-gray-500">
                    <Package className="mx-auto text-gray-300 mb-3" size={40} />
                    <p>Không tìm thấy sản phẩm nào trong kho hàng với điều kiện lọc này.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!isLoading && filteredInventory.length > 0 && (
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}
