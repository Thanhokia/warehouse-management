import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, MapPin, Database, Eye, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import warehouseService from '../services/warehouseService';
import ConfirmModal from '../components/ConfirmModal';

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  
  const [viewingWarehouse, setViewingWarehouse] = useState(null);
  const [warehouseStock, setWarehouseStock] = useState([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  const [formData, setFormData] = useState({ code: '', name: '', address: '', description: '', isActive: true });
  const [error, setError] = useState('');
  
  const [confirmState, setConfirmState] = useState({ isOpen: false, warehouse: null });

  const fetchWarehouses = async () => {
    setIsLoading(true);
    try {
      const res = await warehouseService.getAll();
      if (res && res.data) setWarehouses(res.data);
      else if (Array.isArray(res)) setWarehouses(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const filteredWarehouses = warehouses.filter(w => 
    w.name.toLowerCase().includes(search.toLowerCase()) || 
    w.address.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenModal = (warehouse = null) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({ 
        code: warehouse.code || '',
        name: warehouse.name || '', 
        address: warehouse.address || '', 
        description: warehouse.description || '',
        isActive: warehouse.isActive !== false
      });
    } else {
      setEditingWarehouse(null);
      setFormData({ code: '', name: '', address: '', description: '', isActive: true });
    }
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ code: '', name: '', address: '', description: '', isActive: true });
    setError('');
  };

  const handleOpenView = async (warehouse) => {
    setIsLoadingDetails(true);
    setViewingWarehouse(warehouse);
    
    try {
      const [res, stockRes] = await Promise.all([
        warehouseService.getById(warehouse.id),
        warehouseService.getStock(warehouse.id)
      ]);
      if (res && res.data) setViewingWarehouse(res.data);
      else if (res && !res.status) setViewingWarehouse(res);

      if (stockRes && stockRes.data) setWarehouseStock(stockRes.data);
      else if (Array.isArray(stockRes)) setWarehouseStock(stockRes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCloseView = () => {
    setViewingWarehouse(null);
    setWarehouseStock([]);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim() || !formData.address.trim()) {
      setError('Vui lòng điền đầy đủ Mã kho, Tên kho và Địa chỉ.');
      return;
    }

    try {
      if (editingWarehouse) {
        await warehouseService.update(editingWarehouse.id, formData);
        toast.success('Cập nhật kho hàng thành công!');
      } else {
        await warehouseService.create(formData);
        toast.success('Thêm mới kho hàng thành công!');
      }
      handleCloseModal();
      fetchWarehouses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra từ máy chủ.');
      setError(err.response?.data?.message || 'Có lỗi xảy ra từ máy chủ.');
    }
  };

  const openConfirmDelete = async (warehouse) => {
    try {
      const stockRes = await warehouseService.getStock(warehouse.id);
      const stock = stockRes?.data || (Array.isArray(stockRes) ? stockRes : []);
      
      // Calculate total quantity across all products in this warehouse
      const totalStock = stock.reduce((sum, item) => sum + (item.quantity || 0), 0);
      
      if (totalStock > 0) {
        toast.error(`Không thể xóa: Kho "${warehouse.name}" vẫn đang chứa ${totalStock} sản phẩm!`);
        return;
      }
      
      setConfirmState({ isOpen: true, warehouse });
    } catch (err) {
      toast.error('Lỗi khi kiểm tra dữ liệu kho');
    }
  };
  
  const closeConfirm = () => {
    setConfirmState({ isOpen: false, warehouse: null });
  };

  const handleDelete = async () => {
    if (!confirmState.warehouse) return;
    try {
      await warehouseService.delete(confirmState.warehouse.id);
      toast.success('Xóa kho hàng thành công!');
      fetchWarehouses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xóa kho hàng này!');
    } finally {
      closeConfirm();
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-primary">Quản lý Kho hàng</h1>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-primary text-white px-4 py-2 rounded shadow hover:bg-primary-dark transition flex items-center gap-2"
        >
          <Plus size={20} />
          Thêm Kho
        </button>
      </div>

      <div className="bg-surface rounded-lg shadow p-5">
        {/* Search Bar */}
        <div className="relative mb-6 max-w-md">
          <input 
            type="text" 
            placeholder="Tìm kiếm theo tên hoặc địa chỉ kho..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded focus:ring-2 focus:ring-primary focus:outline-none"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
        </div>

        {/* Grid/Table View */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Mã Kho</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Tên Kho</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Địa chỉ</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Mô tả</th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium">Trạng thái</th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="text-center py-10">
                    <Loader2 className="animate-spin text-primary mx-auto mb-2" size={32} />
                    <p className="text-gray-500">Đang tải dữ liệu kho...</p>
                  </td>
                </tr>
              ) : filteredWarehouses.length > 0 ? (
                filteredWarehouses.map((warehouse) => (
                  <tr key={warehouse.id} className="border-b hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-medium text-gray-800">
                      {warehouse.code}
                    </td>
                    <td className="py-3 px-4 font-medium text-primary">
                      {warehouse.name}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={16} className="text-gray-400" />
                        {warehouse.address}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      <div className="flex items-center gap-1.5 text-sm">
                        {warehouse.description || 'Không có mô tả'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${warehouse.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {warehouse.isActive ? 'Hoạt động' : 'Đóng cửa'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-3">
                        <button 
                          onClick={() => handleOpenView(warehouse)}
                          className="text-gray-500 hover:text-gray-700"
                          title="Xem chi tiết"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleOpenModal(warehouse)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Sửa"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => openConfirmDelete(warehouse)}
                          className="text-red-500 hover:text-red-700"
                          title="Xóa"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">
                    Không tìm thấy kho hàng nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold text-primary">
                {editingWarehouse ? 'Sửa Kho Hàng' : 'Thêm Kho Hàng Mới'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Mã kho <span className="text-red-500">*</span></label>
                  <input 
                    type="text"
                    value={formData.code}
                    onChange={(e) => { setFormData({...formData, code: e.target.value}); setError(''); }}
                    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                    placeholder="VD: KHO01"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Tên kho <span className="text-red-500">*</span></label>
                  <input 
                    type="text"
                    value={formData.name}
                    onChange={(e) => { setFormData({...formData, name: e.target.value}); setError(''); }}
                    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                    placeholder="VD: Kho Trung tâm"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-1">Địa chỉ <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  value={formData.address}
                  onChange={(e) => { setFormData({...formData, address: e.target.value}); setError(''); }}
                  className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="Địa chỉ đầy đủ"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-1">Mô tả kho</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => { setFormData({...formData, description: e.target.value}); setError(''); }}
                  className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="Mô tả chức năng kho, lưu ý..."
                  rows={2}
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-1">Trạng thái hoạt động</label>
                <select
                  value={formData.isActive}
                  onChange={(e) => { setFormData({...formData, isActive: e.target.value === 'true'}); setError(''); }}
                  className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                >
                  <option value={true}>Hoạt động</option>
                  <option value={false}>Đóng cửa / Ngừng nhập xuất</option>
                </select>
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
                  {editingWarehouse ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingWarehouse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold text-primary">
                Chi tiết Kho hàng & Tồn kho
              </h2>
              <button 
                onClick={handleCloseView} 
                className="text-gray-500 hover:text-gray-700"
                disabled={isLoadingDetails}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {isLoadingDetails ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="animate-spin text-primary mb-2" size={32} />
                  <p className="text-gray-500">Đang tải dữ liệu...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Info Box */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-sm font-medium text-gray-500">Mã kho</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="block text-gray-900 font-semibold bg-gray-100 rounded px-2 py-0.5">{viewingWarehouse.code}</span>
                      </div>
                    </div>
                    <div>
                      <span className="block text-sm font-medium text-gray-500">Tên kho</span>
                      <span className="block text-gray-900 font-bold text-lg text-primary">{viewingWarehouse.name}</span>
                    </div>

                    <div>
                      <span className="block text-sm font-medium text-gray-500">Địa chỉ</span>
                      <div className="flex items-start gap-1.5 mt-1 border p-2 rounded bg-gray-50">
                         <MapPin size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                         <span className="block text-gray-900">{viewingWarehouse.address}</span>
                      </div>
                    </div>
                    <div>
                      <span className="block text-sm font-medium text-gray-500">Trạng thái</span>
                      <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded mt-1 ${viewingWarehouse.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {viewingWarehouse.isActive ? 'Đang Hoạt động' : 'Tạm Đóng'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="block text-sm font-medium text-gray-500">Mô tả kho</span>
                    <span className="block text-gray-900 bg-blue-50/50 p-3 rounded mt-1 text-sm border border-blue-50">
                      {viewingWarehouse.description || 'Không có mô tả chi tiết'}
                    </span>
                  </div>

                  {/* Stock Table List */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                       <Database size={18} className="text-blue-600" />
                       Tình trạng Tồn kho ({warehouseStock.length} sản phẩm)
                    </h3>
                    <div className="bg-white border rounded">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b text-sm">
                            <th className="text-left py-2 px-3 text-gray-600 font-medium">Mã SP</th>
                            <th className="text-left py-2 px-3 text-gray-600 font-medium">Tên SP</th>
                            <th className="text-right py-2 px-3 text-gray-600 font-medium">Số lượng</th>
                            <th className="text-left py-2 px-3 text-gray-600 font-medium">Đơn vị</th>
                          </tr>
                        </thead>
                        <tbody>
                          {warehouseStock.length > 0 ? warehouseStock.map(item => (
                            <tr key={item.id} className="border-b last:border-b-0 hover:bg-gray-50">
                               <td className="py-2 px-3 text-sm text-gray-800">{item.productCode}</td>
                               <td className="py-2 px-3 text-sm text-gray-800 font-medium">{item.productName}</td>
                               <td className="py-2 px-3 text-sm text-right font-bold text-blue-600">{item.quantity}</td>
                               <td className="py-2 px-3 text-sm text-gray-500">{item.productUnit}</td>
                            </tr>
                          )) : (
                            <tr>
                               <td colSpan="4" className="text-center py-4 text-sm text-gray-500">
                                 Kho hàng đang trống, chưa nhập sản phẩm nào.
                               </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <span className="block text-sm font-medium text-gray-500">Kho được tạo vào lúc</span>
                    <span className="block text-gray-900 text-sm mt-1">{new Date(viewingWarehouse.createdAt).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t flex justify-end bg-gray-50 rounded-b-lg">
               <button 
                 onClick={handleCloseView}
                 className="px-6 py-2 border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-100 font-medium transition"
               >
                 Đóng
               </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmState.isOpen}
        title="Xác nhận Xóa Kho"
        message={`Bạn có chắc chắn muốn xóa kho "${confirmState.warehouse?.name}" không? Hành động này không thể hoàn tác.`}
        onConfirm={handleDelete}
        onCancel={closeConfirm}
        confirmText="Xóa kho"
      />
    </div>
  );
}
