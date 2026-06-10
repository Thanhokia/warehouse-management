import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, X, MapPin, Database, Eye, Loader2, ClipboardCheck, Save, Minus, ChevronDown, Check, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import warehouseService from '../services/warehouseService';
import authService from '../services/authService';
import activityService from '../services/activityService';
import inventoryCheckService from '../services/inventoryCheckService';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/common/Pagination';

export default function Warehouses() {
  const currentUser = authService.getCurrentUser();
  const isUserAdmin = currentUser?.role === 'ADMIN';

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
  const [largeDiffConfirmState, setLargeDiffConfirmState] = useState({ isOpen: false, request: null, count: 0 });

  const [activeTab, setActiveTab] = useState('list');
  const [isCreatingCheck, setIsCreatingCheck] = useState(false);
  const [viewingCheck, setViewingCheck] = useState(null);
  const [inventoryChecks, setInventoryChecks] = useState([]);
  const [selectedCheckWarehouseId, setSelectedCheckWarehouseId] = useState('');

  const [inventoryAdjustments, setInventoryAdjustments] = useState({});
  const [isSavingInventory, setIsSavingInventory] = useState(false);
  const [checkSearch, setCheckSearch] = useState('');
  const [checkFilterTab, setCheckFilterTab] = useState('all'); // all, unchecked, diff

  const [checkCurrentPage, setCheckCurrentPage] = useState(1);
  const CHECKS_PER_PAGE = 10;

  const [stockCurrentPage, setStockCurrentPage] = useState(1);
  const STOCK_PER_PAGE = 10;

  const fetchWarehouses = async () => {
    setIsLoading(true);
    try {
      const res = await warehouseService.getAll();
      let data = [];
      if (res && res.data) data = res.data;
      else if (Array.isArray(res)) data = res;
      setWarehouses(data.filter(w => w.isActive !== false));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInventoryChecks = async () => {
    try {
      const res = await inventoryCheckService.getAll();
      if (res && res.data) setInventoryChecks(res.data);
    } catch (err) {
      console.error('Lỗi khi tải phiếu kiểm kê:', err);
    }
  };

  useEffect(() => {
    localStorage.removeItem('mockInventoryChecks'); // Xóa dữ liệu cũ
    fetchWarehouses();
    fetchInventoryChecks();
  }, []);

  // Reset page when checks change
  useEffect(() => {
    setCheckCurrentPage(1);
  }, [inventoryChecks.length]);

  const checkTotalPages = Math.ceil(inventoryChecks.length / CHECKS_PER_PAGE);
  const paginatedChecks = inventoryChecks.slice(
    (checkCurrentPage - 1) * CHECKS_PER_PAGE,
    checkCurrentPage * CHECKS_PER_PAGE
  );

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

  const handleSelectCheckWarehouse = async (e) => {
    const wId = e.target.value;
    setSelectedCheckWarehouseId(wId);
    if (!wId) {
      setWarehouseStock([]);
      setInventoryAdjustments({});
      return;
    }
    
    setIsLoadingDetails(true);
    try {
      const stockRes = await warehouseService.getStock(wId);
      let stock = [];
      if (stockRes && stockRes.data) stock = stockRes.data;
      else if (Array.isArray(stockRes)) stock = stockRes;
      
      setWarehouseStock(stock);

      const initialAdjustments = {};
      stock.forEach(item => {
        initialAdjustments[item.id] = {
          actualQuantity: '',
          reason: '',
          isChecked: false
        };
      });
      setInventoryAdjustments(initialAdjustments);
      setCheckSearch('');
      setCheckFilterTab('all');
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải thông tin kho.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCreateNewCheck = () => {
    setIsCreatingCheck(true);
    setSelectedCheckWarehouseId('');
    setWarehouseStock([]);
  };

  const handleAdjustmentChange = (itemId, field, value) => {
    let finalValue = value;
    if (field === 'actualQuantity' && value !== '') {
      const num = parseInt(value, 10);
      if (num < 0) finalValue = '0';
    }

    setInventoryAdjustments(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: finalValue,
        isChecked: true
      }
    }));
  };

  const handleQtyStep = (item, step) => {
    const currentAdj = inventoryAdjustments[item.id] || { actualQuantity: item.quantity };
    const currentQty = parseInt(currentAdj.actualQuantity) || 0;
    const newQty = Math.max(0, currentQty + step);
    handleAdjustmentChange(item.id, 'actualQuantity', newQty);
  };

  const handleSaveInventoryCheck = async () => {
    if (!selectedCheckWarehouseId) return;

    const details = [];
    warehouseStock.forEach(item => {
      const adj = inventoryAdjustments[item.id];
      if (adj && adj.actualQuantity !== '' && adj.actualQuantity !== undefined) {
        details.push({
          productId: item.productId,
          originalQuantity: item.quantity,
          actualQuantity: parseInt(adj.actualQuantity) || 0,
          reason: adj.reason || 'Kiểm kê kho định kỳ'
        });
      }
    });

    if (details.length === 0) {
      toast.error('Chưa có hàng hóa nào được kiểm kê');
      return;
    }

    const largeDiscrepancyItems = [];
    const missingReasonItems = [];

    details.forEach(d => {
      const diff = Math.abs(d.actualQuantity - d.originalQuantity);
      const isLarge = diff >= 10 || (d.originalQuantity > 0 && diff / d.originalQuantity >= 0.2);
      
      if (isLarge) {
        largeDiscrepancyItems.push(d);
        if (d.reason === 'Kiểm kê kho định kỳ' || d.reason.trim().length < 5) {
          missingReasonItems.push(d);
        }
      }
    });

    if (missingReasonItems.length > 0) {
      toast.error('Có sản phẩm chênh lệch quá lớn. Vui lòng ghi rõ lý do chi tiết ở cột Ghi chú!');
      return;
    }

    if (largeDiscrepancyItems.length > 0) {
      setLargeDiffConfirmState({ 
        isOpen: true, 
        request: { warehouseId: parseInt(selectedCheckWarehouseId), details: details }, 
        count: largeDiscrepancyItems.length 
      });
      return;
    }

    await executeSaveInventoryCheck({ warehouseId: parseInt(selectedCheckWarehouseId), details: details });
  };

  const executeSaveInventoryCheck = async (request) => {
    setIsSavingInventory(true);
    try {
      const res = await inventoryCheckService.create(request);

      if (isUserAdmin) {
        const createdCheckId = res?.data?.id || res?.id;
        if (createdCheckId) {
          await inventoryCheckService.approve(createdCheckId);
          toast.success('Đã lưu và tự động duyệt phiếu kiểm kê!');
        } else {
          toast.success('Đã lưu phiếu kiểm kê!');
        }
      } else {
        toast.success('Đã lưu phiếu kiểm kê! Vui lòng chờ Admin duyệt.');
      }
      setIsCreatingCheck(false);
      setWarehouseStock([]);
      setSelectedCheckWarehouseId('');
      fetchInventoryChecks();
    } catch (err) {
      toast.error('Có lỗi xảy ra khi lưu kiểm kê.');
      console.error(err);
    } finally {
      setIsSavingInventory(false);
      setLargeDiffConfirmState({ isOpen: false, request: null, count: 0 });
    }
  };

  const handleApproveCheck = async (check) => {
    try {
      await inventoryCheckService.approve(check.id);
      toast.success(`Đã duyệt phiếu ${check.code} và cập nhật tồn kho!`);
      fetchInventoryChecks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi duyệt phiếu.');
      console.error(err);
    }
  };

  const handleRejectCheck = async (check) => {
    try {
      await inventoryCheckService.reject(check.id);
      toast.success(`Đã từ chối duyệt phiếu ${check.code}.`);
      fetchInventoryChecks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi từ chối phiếu.');
      console.error(err);
    }
  };

  const handleCloseView = () => {
    setViewingWarehouse(null);
    setWarehouseStock([]);
    setInventoryAdjustments({});
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

  // Tính toán số liệu thống kê kiểm kê
  const totalItems = warehouseStock.length;
  let checkedCount = 0;
  let matchCount = 0;
  let surplusCount = 0;
  let missingCount = 0;

  warehouseStock.forEach(item => {
    const adj = inventoryAdjustments[item.id];
    if (adj && adj.isChecked && adj.actualQuantity !== '') {
      checkedCount++;
      const diff = (parseInt(adj.actualQuantity) || 0) - item.quantity;
      if (diff === 0) matchCount++;
      else if (diff > 0) surplusCount++;
      else missingCount++;
    }
  });

  const progressPercent = totalItems === 0 ? 0 : Math.round((checkedCount / totalItems) * 100);

  const filteredStock = warehouseStock.filter(item => {
    if (checkSearch && !item.productCode.toLowerCase().includes(checkSearch.toLowerCase()) && !item.productName.toLowerCase().includes(checkSearch.toLowerCase())) {
      return false;
    }
    const adj = inventoryAdjustments[item.id];
    const diff = adj && adj.isChecked && adj.actualQuantity !== '' ? (parseInt(adj.actualQuantity) || 0) - item.quantity : 0;

    if (checkFilterTab === 'unchecked') return !adj || !adj.isChecked || adj.actualQuantity === '';
    if (checkFilterTab === 'diff') return adj && adj.isChecked && adj.actualQuantity !== '' && diff !== 0;
    return true;
  });

  // Pagination for stock list
  useEffect(() => {
    setStockCurrentPage(1);
  }, [checkSearch, checkFilterTab, selectedCheckWarehouseId]);

  const stockTotalPages = Math.ceil(filteredStock.length / STOCK_PER_PAGE);
  const paginatedStock = filteredStock.slice(
    (stockCurrentPage - 1) * STOCK_PER_PAGE,
    stockCurrentPage * STOCK_PER_PAGE
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-primary">Quản lý Kho hàng</h1>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => { setActiveTab('list'); setWarehouseStock([]); setViewingWarehouse(null); }}
          className={`py-2 px-6 font-semibold text-sm border-b-2 transition ${activeTab === 'list' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Danh sách kho
        </button>
        <button
          onClick={() => { setActiveTab('check'); setIsCreatingCheck(false); setWarehouseStock([]); setViewingWarehouse(null); }}
          className={`py-2 px-6 font-semibold text-sm border-b-2 transition ${activeTab === 'check' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Kiểm kê kho
        </button>
      </div>

      {activeTab === 'list' ? (
        <div className="bg-surface rounded-lg shadow p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Danh sách kho hàng</h2>
            <button
              onClick={() => handleOpenModal()}
              className="bg-primary text-white px-4 py-2 rounded shadow hover:bg-primary-dark transition flex items-center gap-2 text-sm font-medium"
            >
              <Plus size={18} />
              Thêm Kho
            </button>
          </div>
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
          <div className="overflow-x-auto w-full">
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
                      <span className={`inline-block px-2 py-1 text-xs font-semibold ${warehouse.isActive ? 'text-green-600' : 'text-red-600'}`}>
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
        </div>
      ) : !isCreatingCheck ? (
        <div className="bg-surface rounded-lg shadow p-5">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Danh sách phiếu kiểm kê</h2>
            <button
              onClick={handleCreateNewCheck}
              className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary-dark transition flex items-center gap-2 text-sm font-medium"
            >
              <Plus size={18} />
              Tạo phiếu kiểm kê
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <div className="overflow-x-auto w-full">
<table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Mã phiếu</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Kho hàng</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Ngày tạo</th>
                  <th className="text-center py-3 px-4 text-gray-600 font-medium">Trạng thái</th>
                  <th className="text-center py-3 px-4 text-gray-600 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedChecks.length > 0 ? paginatedChecks.map(check => (
                  <tr key={check.id} className="border-b hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-semibold text-gray-900">{check.code}</td>
                    <td className="py-3 px-4 text-gray-800">{check.warehouseName}</td>
                    <td className="py-3 px-4 text-gray-500">{new Date(check.createdAt).toLocaleString('vi-VN')}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 text-xs font-semibold ${check.status === 'Chờ duyệt' ? 'text-yellow-600' : check.status === 'Đã từ chối' ? 'text-red-600' : 'text-green-600'}`}>
                        {check.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setViewingCheck(check)} className="text-gray-400 hover:text-indigo-600 transition" title="Xem chi tiết">
                          <Eye size={18} />
                        </button>
                        {check.status === 'Chờ duyệt' && isUserAdmin && (
                          <>
                            <button 
                              onClick={() => handleApproveCheck(check)}
                              className="text-gray-400 hover:text-green-600 transition"
                              title="Duyệt phiếu"
                            >
                              <Check size={18} />
                            </button>
                            <button 
                              onClick={() => handleRejectCheck(check)}
                              className="text-gray-400 hover:text-red-600 transition ml-1"
                              title="Từ chối"
                            >
                              <X size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <ClipboardList size={40} className="mb-3 opacity-30" />
                        Chưa có phiếu kiểm kê nào được tạo.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
</div>
          </div>
          
          {inventoryChecks.length > 0 && (
            <div className="mt-4">
              <Pagination
                currentPage={checkCurrentPage}
                totalPages={checkTotalPages}
                onPageChange={setCheckCurrentPage}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col">
          {/* INVENTORY CHECK HEADER (Dark Blue) */}
          <div className="flex justify-between items-center p-4 border-b bg-[#1e293b] text-white shrink-0">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-500 p-2.5 rounded-xl shadow-inner">
                <ClipboardCheck size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-wide">Kiểm kê kho</h2>
                <p className="text-sm text-gray-300 mt-0.5">
                  Mã phiếu: <span className="text-blue-300 font-semibold">KK{String(selectedCheckWarehouseId || '---').padStart(6, '0')}</span> • {new Date().toLocaleString('vi-VN')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 border-r border-slate-600 pr-5 mr-1">
                <span className="text-sm font-medium text-gray-300">Kho kiểm kê:</span>
                <select
                  value={selectedCheckWarehouseId}
                  onChange={handleSelectCheckWarehouse}
                  className="bg-slate-700 text-white border border-slate-500 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-400 focus:outline-none text-sm font-medium outline-none appearance-none cursor-pointer hover:bg-slate-600 transition"
                >
                  <option value="" disabled>-- Chọn kho kiểm kê --</option>
                  {warehouses.filter(w => !w.name.includes('_deleted_') && w.isActive !== false).map(w => (
                    <option key={w.id} value={w.id}>{w.code} - {w.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSaveInventoryCheck}
                disabled={isSavingInventory || !selectedCheckWarehouseId || warehouseStock.length === 0}
                className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-semibold transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingInventory ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Lưu phiếu kiểm kê
              </button>
              <button 
                onClick={() => { setIsCreatingCheck(false); setSelectedCheckWarehouseId(''); setWarehouseStock([]); }} 
                className="text-gray-400 hover:text-white hover:bg-slate-700 transition p-2.5 rounded-lg ml-1"
                title="Đóng và quay lại"
              >
                <X size={22} />
              </button>
            </div>
          </div>
          
          <div className="p-6 bg-slate-50">

          {isLoadingDetails ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin text-primary mb-2" size={40} />
              <p className="text-gray-500">Đang tải dữ liệu kho...</p>
            </div>
          ) : selectedCheckWarehouseId && warehouseStock.length > 0 ? (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Summary Cards */}
              <div className="grid grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col items-start justify-center">
                  <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tổng mặt hàng</span>
                  <span className="block text-2xl font-bold text-gray-700">{totalItems}</span>
                </div>
                <div className="bg-white p-4 rounded-lg border border-indigo-200 shadow-sm flex flex-col items-start justify-center">
                  <span className="block text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">Đã kiểm</span>
                  <span className="block text-2xl font-bold text-indigo-600">{checkedCount}<span className="text-lg font-medium text-indigo-300 ml-1">/{totalItems}</span></span>
                </div>
                <div className="bg-white p-4 rounded-lg border border-green-200 shadow-sm flex flex-col items-start justify-center">
                  <span className="block text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">Khớp</span>
                  <span className="block text-2xl font-bold text-green-500">{matchCount}</span>
                </div>
                <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm flex flex-col items-start justify-center">
                  <span className="block text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Thừa</span>
                  <span className="block text-2xl font-bold text-blue-500">{surplusCount}</span>
                </div>
                <div className="bg-white p-4 rounded-lg border border-red-200 shadow-sm flex flex-col items-start justify-center">
                  <span className="block text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Thiếu</span>
                  <span className="block text-2xl font-bold text-red-500">{missingCount}</span>
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Tìm mã hoặc tên hàng..."
                    value={checkSearch}
                    onChange={(e) => setCheckSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200 shadow-inner">
                    <button onClick={() => setCheckFilterTab('all')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${checkFilterTab === 'all' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}>Tất cả</button>
                    <button onClick={() => setCheckFilterTab('unchecked')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${checkFilterTab === 'unchecked' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}>Chưa kiểm</button>
                    <button onClick={() => setCheckFilterTab('diff')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${checkFilterTab === 'diff' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}>Lệch</button>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto w-full">
<table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                      <th className="text-left py-4 px-6 font-bold">Mã SP</th>
                      <th className="text-left py-4 px-6 font-bold">Tên hàng hóa</th>
                      <th className="text-left py-4 px-4 font-bold">ĐVT</th>
                      <th className="text-right py-4 px-6 font-bold">Tồn HT (SL)</th>
                      <th className="text-center py-4 px-6 font-bold w-48">Thực tế (SL)</th>
                      <th className="text-center py-4 px-6 font-bold">Chênh lệch</th>
                      <th className="text-left py-4 px-6 font-bold w-1/4">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStock.length > 0 ? paginatedStock.map(item => {
                      const actualQty = inventoryAdjustments[item.id]?.actualQuantity ?? '';
                      const isEditing = inventoryAdjustments[item.id]?.isChecked && actualQty !== '';
                      const diff = isEditing ? parseInt(actualQty) - item.quantity : 0;

                      return (
                        <tr key={item.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 text-sm transition group">
                          <td className="py-4 px-6 font-bold text-indigo-600">{item.productCode}</td>
                          <td className="py-4 px-6">
                            <div className="font-bold text-gray-800">{item.productName}</div>
                          </td>
                          <td className="py-4 px-4 font-medium text-gray-600">{item.productUnit}</td>
                          <td className="py-4 px-6 text-right">
                            <span className="font-bold text-gray-800 text-base">{item.quantity}</span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center">
                              <input
                                type="number"
                                min="0"
                                value={actualQty}
                                onChange={(e) => handleAdjustmentChange(item.id, 'actualQuantity', e.target.value)}
                                placeholder="Nhập..."
                                className={`w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-center font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none transition ${isEditing && diff !== 0 ? 'text-indigo-600' : 'text-gray-700'}`}
                              />
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center font-bold text-base">
                            {isEditing ? (
                              <span className={diff > 0 ? 'text-blue-500' : diff < 0 ? 'text-red-500' : 'text-green-500'}>
                                {diff > 0 ? `+${diff}` : diff}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <input
                              type="text"
                              value={inventoryAdjustments[item.id]?.reason || ''}
                              onChange={(e) => handleAdjustmentChange(item.id, 'reason', e.target.value)}
                              placeholder="Ghi chú..."
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm transition"
                            />
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan="7" className="text-center py-12">
                          <div className="flex flex-col items-center justify-center text-gray-400">
                            <Database size={40} className="mb-3 opacity-50" />
                            <span className="text-sm">Không tìm thấy mặt hàng nào phù hợp.</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
</div>
              </div>
              
              {filteredStock.length > 0 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={stockCurrentPage}
                    totalPages={stockTotalPages}
                    onPageChange={setStockCurrentPage}
                  />
                </div>
              )}
            </div>
          ) : selectedCheckWarehouseId ? (
            <div className="text-center py-12 text-gray-500 flex flex-col items-center">
              <Database size={40} className="mb-3 opacity-30" />
              Kho này hiện chưa có mặt hàng nào.
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400 flex flex-col items-center bg-gray-50 rounded-xl border border-dashed border-gray-300 mt-6">
              <ClipboardList size={48} className="mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">Vui lòng chọn một kho hàng để bắt đầu kiểm kê.</p>
              <p className="text-sm mt-1">Chọn kho từ danh sách xổ xuống ở trên để tải dữ liệu.</p>
            </div>
          )}
          </div>
        </div>
      )}

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
                    onChange={(e) => { setFormData({ ...formData, code: e.target.value }); setError(''); }}
                    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                    placeholder="VD: KHO01"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Tên kho <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setError(''); }}
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
                  onChange={(e) => { setFormData({ ...formData, address: e.target.value }); setError(''); }}
                  className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="Địa chỉ đầy đủ"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-1">Mô tả kho</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => { setFormData({ ...formData, description: e.target.value }); setError(''); }}
                  className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="Mô tả chức năng kho, lưu ý..."
                  rows={2}
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-1">Trạng thái hoạt động</label>
                <select
                  value={formData.isActive}
                  onChange={(e) => { setFormData({ ...formData, isActive: e.target.value === 'true' }); setError(''); }}
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col transition-all duration-300">
            <div className="flex justify-between items-center p-4 border-b shrink-0">
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

            <div className="p-6 overflow-y-auto flex-1 bg-white">
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
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Database size={18} className="text-blue-600" />
                        Tình trạng Tồn kho ({warehouseStock.length} sản phẩm)
                      </h3>
                      <button
                        onClick={() => {
                          const wId = viewingWarehouse.id;
                          handleCloseView();
                          setActiveTab('check');
                          setIsCreatingCheck(true);
                          handleSelectCheckWarehouse({ target: { value: wId } });
                        }}
                        className="px-4 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 font-medium transition flex items-center gap-2 text-sm shadow-sm"
                      >
                        <ClipboardCheck size={16} />
                        Kiểm kê kho
                      </button>
                    </div>
                    <div className="bg-white border rounded">
                      <div className="overflow-x-auto w-full">
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
                  </div>

                  <div className="border-t pt-4">
                    <span className="block text-sm font-medium text-gray-500">Kho được tạo vào lúc</span>
                    <span className="block text-gray-900 text-sm mt-1">{new Date(viewingWarehouse.createdAt).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t flex justify-end gap-3 bg-gray-50 rounded-b-lg shrink-0">
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

      {/* View Check Modal */}
      {viewingCheck && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b bg-gray-50 rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Chi tiết phiếu kiểm kê {viewingCheck.code}</h2>
                <p className="text-sm text-gray-500 mt-1">{viewingCheck.warehouseName} • {new Date(viewingCheck.createdAt).toLocaleString('vi-VN')}</p>
              </div>
              <button onClick={() => setViewingCheck(null)} className="text-gray-400 hover:text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-full p-2 transition">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-white flex-1">
              <div className="flex justify-between items-center mb-4">
                <span className={`px-2 py-1 text-sm font-semibold ${viewingCheck.status === 'Chờ duyệt' ? 'text-yellow-600' : viewingCheck.status === 'Đã từ chối' ? 'text-red-600' : 'text-green-600'}`}>
                  Trạng thái: {viewingCheck.status}
                </span>
              </div>
              
              <div className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto w-full">
<table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                      <th className="p-3">Mã SP</th>
                      <th className="p-3">Tên hàng hóa</th>
                      <th className="p-3 text-center">Tồn HT</th>
                      <th className="p-3 text-center">Thực tế</th>
                      <th className="p-3 text-center">Chênh lệch</th>
                      <th className="p-3 w-1/4">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewingCheck.details || viewingCheck.changesToSave || []).length > 0 ? (
                      (viewingCheck.details || viewingCheck.changesToSave).map((item, idx) => {
                        const diff = item.difference !== undefined ? item.difference : (item.actualQuantity - (item.originalQuantity || 0));
                        return (
                          <tr key={idx} className="border-b last:border-b-0 hover:bg-gray-50">
                            <td className="p-3 font-medium text-indigo-600">{item.productCode || item.productId}</td>
                            <td className="p-3 font-semibold text-gray-800">{item.productName || '---'}</td>
                            <td className="p-3 text-center text-gray-500">{item.originalQuantity ?? '?'}</td>
                            <td className="p-3 text-center font-bold text-gray-800">{item.actualQuantity}</td>
                            <td className="p-3 text-center">
                              <span className={`font-bold ${diff > 0 ? 'text-blue-500' : diff < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                {diff > 0 ? `+${diff}` : diff}
                              </span>
                            </td>
                            <td className="p-3 text-sm text-gray-500">{item.reason}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-gray-400">
                          Phiếu này không có thay đổi hoặc chênh lệch nào được ghi nhận.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
</div>
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button onClick={() => setViewingCheck(null)} className="px-5 py-2 text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg transition font-medium shadow-sm">
                Đóng
              </button>
              {viewingCheck.status === 'Chờ duyệt' && isUserAdmin && (
                <>
                  <button 
                    onClick={() => {
                       handleRejectCheck(viewingCheck);
                       setViewingCheck(null);
                    }}
                    className="px-5 py-2 text-white bg-red-500 hover:bg-red-600 rounded-lg transition font-medium flex items-center gap-2 shadow-sm"
                  >
                    <X size={18} />
                    Từ chối
                  </button>
                  <button 
                    onClick={() => {
                       handleApproveCheck(viewingCheck);
                       setViewingCheck(null);
                    }}
                    className="px-5 py-2 text-white bg-green-500 hover:bg-green-600 rounded-lg transition font-medium flex items-center gap-2 shadow-sm"
                  >
                    <Check size={18} />
                    Duyệt phiếu
                  </button>
                </>
              )}
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

      <ConfirmModal
        isOpen={largeDiffConfirmState.isOpen}
        title="Cảnh báo chênh lệch lớn"
        message={`Có ${largeDiffConfirmState.count} sản phẩm chênh lệch tồn kho quá lớn. Bạn có chắc chắn muốn lưu phiếu kiểm kê này không?`}
        onConfirm={() => executeSaveInventoryCheck(largeDiffConfirmState.request)}
        onCancel={() => setLargeDiffConfirmState({ isOpen: false, request: null, count: 0 })}
        confirmText="Vẫn lưu phiếu"
        cancelText="Kiểm tra lại"
        confirmColor="bg-primary hover:bg-primary-dark text-white"
      />
    </div>
  );
}
