import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, Eye, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import categoryService from '../services/categoryService';
import productService from '../services/productService';
import ConfirmModal from '../components/ConfirmModal';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
  const [viewingCategory, setViewingCategory] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  const [formData, setFormData] = useState({ name: '', description: '', type: 'INGREDIENT' });
  const [error, setError] = useState('');
  
  const [confirmState, setConfirmState] = useState({ isOpen: false, categoryId: null });

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        categoryService.getAll(),
        productService.getAll()
      ]);

      let fetchedCategories = [];
      if (catRes && catRes.data) {
        fetchedCategories = catRes.data;
      } else if (Array.isArray(catRes)) {
        fetchedCategories = catRes;
      }

      let fetchedProducts = [];
      if (prodRes && prodRes.data) {
        fetchedProducts = prodRes.data;
      } else if (Array.isArray(prodRes)) {
        fetchedProducts = prodRes;
      }

      // Hide soft-deleted categories
      fetchedCategories = fetchedCategories.filter(c => c.isActive !== false);

      const categoryCounts = {};
      fetchedProducts.forEach(p => {
        if (p.categoryId) {
          categoryCounts[p.categoryId] = (categoryCounts[p.categoryId] || 0) + 1;
        }
      });

      const enrichedCategories = fetchedCategories.map(c => ({
        ...c,
        productCount: categoryCounts[c.id] || 0
      }));

      setCategories(enrichedCategories);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name, description: category.description, type: category.type || 'INGREDIENT' });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '', type: 'INGREDIENT' });
    }
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ name: '', description: '', type: 'INGREDIENT' });
    setError('');
  };

  const handleOpenView = async (category) => {
    setIsLoadingDetails(true);
    setViewingCategory(category); // Show shallow info immediately
    
    try {
      const res = await categoryService.getById(category.id);
      if (res && res.data) {
        setViewingCategory(res.data);
      } else if (res && !res.status) {
        setViewingCategory(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCloseView = () => {
    setViewingCategory(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Tên danh mục không được để trống.');
      return;
    }

    try {
      if (editingCategory) {
        await categoryService.update(editingCategory.id, formData);
        toast.success('Cập nhật danh mục thành công!');
      } else {
        await categoryService.create(formData);
        toast.success('Thêm mới danh mục thành công!');
      }
      handleCloseModal();
      fetchCategories(); // Refresh table
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra từ máy chủ.');
      setError(err.response?.data?.message || 'Có lỗi xảy ra từ máy chủ.');
    }
  };

  const openConfirmDelete = (id) => {
    setConfirmState({ isOpen: true, categoryId: id });
  };
  
  const closeConfirm = () => {
    setConfirmState({ isOpen: false, categoryId: null });
  };

  const handleDelete = async () => {
    if (!confirmState.categoryId) return;
    try {
      await categoryService.delete(confirmState.categoryId);
      toast.success('Xóa danh mục thành công!');
      fetchCategories(); // Refresh table
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xóa danh mục này!');
    } finally {
      closeConfirm();
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-primary">Quản lý Danh mục</h1>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-primary text-white px-4 py-2 rounded shadow hover:bg-primary-dark transition flex items-center gap-2"
        >
          <Plus size={20} />
          Thêm Danh mục
        </button>
      </div>

      <div className="bg-surface rounded-lg shadow p-4">
        {/* Search Bar */}
        <div className="relative mb-4 max-w-md">
          <input 
            type="text" 
            placeholder="Tìm kiếm danh mục..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded focus:ring-2 focus:ring-primary focus:outline-none"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Tên Danh mục</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Loại</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Mô tả</th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium">Sản phẩm</th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="text-center py-10">
                    <Loader2 className="animate-spin text-primary mx-auto mb-2" size={32} />
                    <p className="text-gray-500">Đang tải danh sách...</p>
                  </td>
                </tr>
              ) : filteredCategories.length > 0 ? (
                filteredCategories.map((category) => (
                  <tr key={category.id} className="border-b hover:bg-gray-50 transition">
                    <td className="py-3 px-4">{category.name}</td>
                    <td className="py-3 px-4 text-gray-600">{category.type === 'INGREDIENT' ? 'Nguyên liệu' : 'Vật tư'}</td>
                    <td className="py-3 px-4 text-gray-600">{category.description}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                        {category.productCount}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-3">
                        <button 
                          onClick={() => handleOpenView(category)}
                          className="text-gray-500 hover:text-gray-700"
                          title="Xem chi tiết"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleOpenModal(category)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Sửa"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => openConfirmDelete(category.id)}
                          className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Xóa"
                          disabled={category.productCount > 0}
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
                    Không tìm thấy danh mục nào.
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
                {editingCategory ? 'Sửa Danh mục' : 'Thêm Danh mục Mới'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Tên danh mục <span className="text-red-500">*</span></label>
                  <input 
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({...formData, name: e.target.value});
                      setError('');
                    }}
                    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                    placeholder="Nhập tên"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Loại danh mục <span className="text-red-500">*</span></label>
                  <select
                    value={formData.type || 'INGREDIENT'}
                    onChange={(e) => {
                      setFormData({...formData, type: e.target.value});
                      setError('');
                    }}
                    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                  >
                    <option value="INGREDIENT">Nguyên liệu</option>
                    <option value="SUPPLY">Vật tư</option>
                  </select>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-1">Mô tả</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                  rows="3"
                  placeholder="Nhập mô tả chi tiết"
                ></textarea>
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
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                >
                  {editingCategory ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold text-primary">
                Chi tiết Danh mục
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
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="animate-spin text-primary mb-2" size={32} />
                  <p className="text-gray-500">Đang tải dữ liệu...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Tên danh mục</span>
                    <span className="block text-gray-900 font-medium text-lg">{viewingCategory.name}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Mô tả</span>
                    <span className="block text-gray-900">{viewingCategory.description || 'Không có mô tả'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-sm font-medium text-gray-500">Số lượng sản phẩm</span>
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded mt-1">
                        {viewingCategory.productCount} sản phẩm
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    <div>
                      <span className="block text-sm font-medium text-gray-500">Ngày tạo</span>
                      <span className="block text-gray-900 text-sm mt-1">{viewingCategory.createdAt}</span>
                    </div>
                    <div>
                      <span className="block text-sm font-medium text-gray-500">Cập nhật lần cuối</span>
                      <span className="block text-gray-900 text-sm mt-1">{viewingCategory.updatedAt}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t flex justify-end">
               <button 
                 onClick={handleCloseView}
                 className="px-6 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium transition"
               >
                 Đóng
               </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmState.isOpen}
        title="Xác nhận Xóa Danh mục"
        message="Bạn có chắc chắn muốn xóa danh mục này không? Các sản phẩm (nếu có) sẽ không bị ảnh hưởng nhưng sẽ mất liên kết danh mục."
        onConfirm={handleDelete}
        onCancel={closeConfirm}
        confirmText="Xóa danh mục"
      />
    </div>
  );
}
