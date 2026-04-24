import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, Filter, Eye, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import productService from '../services/productService';
import categoryService from '../services/categoryService';
import reportService from '../services/reportService';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/common/Pagination';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [viewingProduct, setViewingProduct] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  const [formData, setFormData] = useState({
    code: '', name: '', categoryId: '', unit: '', price: '', minStockLevel: ''
  });
  const [error, setError] = useState('');
  
  const [confirmState, setConfirmState] = useState({ isOpen: false, product: null });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes, stockRes] = await Promise.all([
        productService.getAll(),
        categoryService.getAll(),
        reportService.getAllStock()
      ]);
      
      let fetchedProducts = [];
      if (prodRes && prodRes.data) fetchedProducts = prodRes.data;
      else if (Array.isArray(prodRes)) fetchedProducts = prodRes;

      let fetchedCategories = [];
      if (catRes && catRes.data) fetchedCategories = catRes.data;
      else if (Array.isArray(catRes)) fetchedCategories = catRes;
      setCategories(fetchedCategories);
      
      let fetchedStock = [];
      if (stockRes && stockRes.data) fetchedStock = stockRes.data;
      else if (Array.isArray(stockRes)) fetchedStock = stockRes;

      const stockMap = {};
      const warehouseNamesMap = {};
      fetchedStock.forEach(s => {
        stockMap[s.productId] = (stockMap[s.productId] || 0) + s.quantity;
        if (!warehouseNamesMap[s.productId]) {
          warehouseNamesMap[s.productId] = new Set();
        }
        if (s.warehouseName) {
          warehouseNamesMap[s.productId].add(s.warehouseName);
        }
      });

      const enrichedProducts = fetchedProducts.map(p => ({
        ...p,
        stock: stockMap[p.id] !== undefined ? stockMap[p.id] : null,
        warehouseNames: warehouseNamesMap[p.id] ? Array.from(warehouseNamesMap[p.id]).join(', ') : '',
        hasTransactions: false
      }));

      setProducts(enrichedProducts);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtering
  const filteredProducts = products.filter(p => {
    const matchName = p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter ? p.categoryId.toString() === categoryFilter : true;
    return matchName && matchCategory;
  });

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter]);

  const getCategoryName = (id) => categories.find(c => c.id === id)?.name || 'N/A';

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        code: product.code,
        name: product.name,
        categoryId: product.categoryId,
        unit: product.unit,
        price: product.price,
        minStockLevel: product.minStockLevel
      });
    } else {
      setEditingProduct(null);
      setFormData({ code: '', name: '', categoryId: '', unit: '', price: '', minStockLevel: '' });
    }
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError('');
  };

  const handleOpenView = async (product) => {
    setIsLoadingDetails(true);
    setViewingProduct(product);
    
    try {
      const res = await productService.getById(product.id);
      if (res && res.data) {
        setViewingProduct({ ...res.data, stock: product.stock, warehouseNames: product.warehouseNames });
      } else if (res && !res.status) {
        setViewingProduct({ ...res, stock: product.stock, warehouseNames: product.warehouseNames });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCloseView = () => {
    setViewingProduct(null);
  };

  const handleQuickEdit = () => {
    const productToEdit = viewingProduct;
    handleCloseView();
    setTimeout(() => handleOpenModal(productToEdit), 150);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim() || !formData.categoryId || !formData.unit || !formData.price || !formData.minStockLevel) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    const priceValue = parseFloat(formData.price);
    const minStockValue = parseFloat(formData.minStockLevel);
    
    if (isNaN(priceValue) || priceValue <= 0) {
      setError('Giá sản phẩm phải lớn hơn 0.');
      return;
    }
    
    if (isNaN(minStockValue) || minStockValue <= 0) {
      setError('Mức tồn kho cảnh báo phải lớn hơn 0.');
      return;
    }

    try {
      const payload = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        categoryId: Number(formData.categoryId),
        unit: formData.unit.trim(),
        price: priceValue,
        minStockLevel: minStockValue
      };

      if (editingProduct) {
        await productService.update(editingProduct.id, payload);
        toast.success('Cập nhật sản phẩm thành công!');
      } else {
        await productService.create(payload);
        toast.success('Thêm mới sản phẩm thành công!');
      }
      handleCloseModal();
      fetchData(); // Refresh list
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra từ máy chủ.');
      setError(err.response?.data?.message || 'Có lỗi xảy ra từ máy chủ.');
    }
  };

  const openConfirmDelete = (product) => {
    if (product.stock > 0) {
      toast.error('Không thể xóa sản phẩm đang còn tồn kho!');
      return;
    }
    setConfirmState({ isOpen: true, product });
  };
  
  const closeConfirm = () => {
    setConfirmState({ isOpen: false, product: null });
  };

  const handleDelete = async () => {
    if (!confirmState.product) return;
    try {
      await productService.delete(confirmState.product.id);
      toast.success('Xóa sản phẩm thành công!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xóa sản phẩm này!');
    } finally {
      closeConfirm();
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-primary">Quản lý Sản phẩm</h1>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-primary text-white px-4 py-2 rounded shadow hover:bg-primary-dark transition flex items-center gap-2"
        >
          <Plus size={20} />
          Thêm Sản phẩm
        </button>
      </div>

      <div className="bg-surface rounded-lg shadow p-5">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[250px]">
            <input 
              type="text" 
              placeholder="Tìm theo mã hoặc tên sản phẩm..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
          
          <div className="relative w-64 min-w-[200px]">
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded focus:ring-2 focus:ring-primary focus:outline-none appearance-none"
            >
              <option value="">Tất cả danh mục</option>
              {categories.filter(c => c.isActive !== false).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Filter className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Mã SP</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Tên Sản phẩm</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Danh mục</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Đơn vị</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium">Giá (VNĐ)</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium" >Tồn kho tối thiểu</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium">Tồn kho</th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="text-center py-10">
                    <Loader2 className="animate-spin text-primary mx-auto mb-2" size={32} />
                    <p className="text-gray-500">Đang tải dữ liệu sản phẩm...</p>
                  </td>
                </tr>
              ) : paginatedProducts.length > 0 ? (
                paginatedProducts.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-medium">{product.code}</td>
                    <td className="py-3 px-4">{product.name}</td>
                    <td className="py-3 px-4">{getCategoryName(product.categoryId)}</td>
                    <td className="py-3 px-4">{product.unit}</td>
                    <td className="py-3 px-4 text-right">{product.price.toLocaleString('vi-VN')}</td>
                    <td className="py-3 px-4 text-right text-gray-500">{product.minStockLevel || 0}</td>
                    <td className="py-3 px-4 text-right">
                       <span className={`font-semibold ${product.stock === null ? 'text-gray-400 font-normal italic text-sm' : (product.stock <= (product.minStockLevel || 10) ? 'text-danger' : 'text-success')}`}>
                         {product.stock === null ? 'Chưa nhập kho' : product.stock}
                       </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-3">
                        <button 
                          onClick={() => handleOpenView(product)}
                          className="text-gray-500 hover:text-gray-700"
                          title="Xem chi tiết"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleOpenModal(product)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Sửa"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => openConfirmDelete(product)}
                          className={`text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed`}
                          title={(product.stock !== null && product.stock > 0) || product.hasTransactions ? "Không thể xóa" : "Xóa"}
                          disabled={(product.stock !== null && product.stock > 0) || product.hasTransactions}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-500">
                    Không tìm thấy sản phẩm nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!isLoading && filteredProducts.length > 0 && (
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold text-primary">
                {editingProduct ? 'Sửa Sản phẩm' : 'Thêm Sản phẩm Mới'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                 <div>
                    <label className="block text-gray-700 font-medium mb-1">Mã sản phẩm <span className="text-red-500">*</span></label>
                    <input 
                      type="text"
                      value={formData.code}
                      onChange={(e) => { setFormData({...formData, code: e.target.value}); setError(''); }}
                      className="w-full border rounded px-3 py-2"
                      placeholder="VD: SP001"
                    />
                 </div>
                 <div>
                    <label className="block text-gray-700 font-medium mb-1">Đơn vị tính <span className="text-red-500">*</span></label>
                    <select
                      value={formData.unit}
                      onChange={(e) => { setFormData({...formData, unit: e.target.value}); setError(''); }}
                      className="w-full border rounded px-3 py-2 bg-white"
                    >
                      <option value="">Chọn đơn vị</option>
                      <option value="Kg">Kg</option>
                      <option value="Lít">Lít</option>
                      <option value="Cái">Cái</option>
                      <option value="Chiếc">Chiếc</option>
                      <option value="Gói">Gói</option>
                      <option value="Thùng">Thùng</option>
                      <option value="Hộp">Hộp</option>
                      <option value="Chai">Chai</option>
                      <option value="Lon">Lon</option>
                    </select>
                 </div>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-1">Tên sản phẩm <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => { setFormData({...formData, name: e.target.value}); setError(''); }}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Nhập tên sản phẩm"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-1">Mức tồn kho tối thiểu <span className="text-red-500">*</span></label>
                <input 
                  type="number"
                  min="1"
                  value={formData.minStockLevel}
                  onChange={(e) => { setFormData({...formData, minStockLevel: e.target.value}); setError(''); }}
                  className="w-full border rounded px-3 py-2"
                  placeholder="VD: 5"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                 <div>
                    <label className="block text-gray-700 font-medium mb-1">Danh mục <span className="text-red-500">*</span></label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => { setFormData({...formData, categoryId: e.target.value}); setError(''); }}
                      className="w-full border rounded px-3 py-2 bg-white"
                    >
                      <option value="">Chọn danh mục</option>
                      {categories.filter(c => c.isActive !== false).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                 </div>
                 <div>
                    <label className="block text-gray-700 font-medium mb-1">Giá cơ bản (VNĐ) <span className="text-red-500">*</span></label>
                    <input 
                      type="number"
                      min="1"
                      value={formData.price}
                      onChange={(e) => { setFormData({...formData, price: e.target.value}); setError(''); }}
                      className="w-full border rounded px-3 py-2"
                      placeholder="0"
                    />
                 </div>
              </div>

              {error && (
                <div className="mb-4 text-red-500 text-sm">{error}</div>
              )}

              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark shadow"
                >
                  {editingProduct ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold text-primary">
                Chi tiết Sản phẩm
              </h2>
              <button 
                onClick={handleCloseView} 
                className="text-gray-500 hover:text-gray-700"
                disabled={isLoadingDetails}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              {isLoadingDetails ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="animate-spin text-primary mb-3" size={36} />
                  <p className="text-gray-500 font-medium">Đang lấy dữ liệu sản phẩm...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Cột 1 */}
                  <div className="space-y-4">
                    <div>
                      <span className="block text-sm font-medium text-gray-500">Tên sản phẩm</span>
                      <span className="block text-gray-900 font-bold text-lg">{viewingProduct.name}</span>
                    </div>
                    <div>
                      <span className="block text-sm font-medium text-gray-500">Mã sản phẩm</span>
                      <span className="inline-block bg-gray-100 text-gray-800 text-sm font-semibold px-2 py-1 rounded mt-1">
                        {viewingProduct.code}
                      </span>
                    </div>
                    <div>
                      <span className="block text-sm font-medium text-gray-500">Danh mục</span>
                      <span className="block text-gray-900 mt-1">{getCategoryName(viewingProduct.categoryId)}</span>
                    </div>
                    <div>
                      <span className="block text-sm font-medium text-gray-500">Mô tả</span>
                      <span className="block text-gray-900 mt-1 bg-gray-50 p-3 rounded border text-sm">
                        {viewingProduct.description || 'Chưa có mô tả'}
                      </span>
                    </div>
                  </div>

                  {/* Cột 2 */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded border">
                        <span className="block text-sm font-medium text-gray-500">Giá (VNĐ)</span>
                        <span className="block text-blue-700 font-bold mt-1">
                          {viewingProduct.price.toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded border">
                        <span className="block text-sm font-medium text-gray-500">Đơn vị tính</span>
                        <span className="block text-gray-900 font-medium mt-1">
                          {viewingProduct.unit}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50/50 p-3 rounded border border-blue-100">
                      <span className="block text-sm font-medium text-gray-500 mb-2">Trạng thái Tồn kho</span>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 font-bold rounded-full text-sm ${viewingProduct.stock === null ? 'bg-gray-100 text-gray-600 font-normal' : (viewingProduct.stock <= (viewingProduct.minStockLevel || 10) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}`}>
                          {viewingProduct.stock === null ? 'Chưa từng nhập kho' : `${viewingProduct.stock} ${viewingProduct.unit}`}
                        </span>
                        {viewingProduct.stock !== null && (
                        <span className="text-sm text-gray-600">
                          {viewingProduct.stock <= (viewingProduct.minStockLevel || 10) ? '(Sắp hết)' : '(Bình thường)'}
                        </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="block text-sm font-medium text-gray-500">Kho lưu trữ</span>
                      <span className="block text-gray-900 mt-1 font-medium bg-gray-100 px-3 py-1.5 rounded inline-block">
                        {viewingProduct.warehouseNames || 'Chưa nhập kho nào'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t mt-4">
                      <div>
                        <span className="block text-xs font-medium text-gray-400">Ngày tạo</span>
                        <span className="block text-gray-600 text-sm mt-1">{viewingProduct.createdAt}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-medium text-gray-400">Cập nhật</span>
                        <span className="block text-gray-600 text-sm mt-1">{viewingProduct.updatedAt}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t flex justify-between bg-gray-50 rounded-b-lg">
               {!isLoadingDetails && (
                 <button 
                   onClick={handleQuickEdit}
                   className="px-4 py-2 border border-primary text-primary rounded hover:bg-blue-50 font-medium transition flex items-center gap-2"
                 >
                   <Edit2 size={16} />
                   Sửa nhanh
                 </button>
               )}
               <button 
                 onClick={handleCloseView}
                 className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-100 font-medium transition ml-auto"
               >
                 Đóng
               </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmState.isOpen}
        title="Xác nhận Xóa Sản phẩm"
        message={`Bạn có chắc chắn muốn xóa sản phẩm "${confirmState.product?.name}" không? Hành động này không thể hoàn tác.`}
        onConfirm={handleDelete}
        onCancel={closeConfirm}
        confirmText="Xóa sản phẩm"
      />
    </div>
  );
}
