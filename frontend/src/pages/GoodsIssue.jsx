import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, CheckCircle, FileText, Calendar, User, PackageMinus, Type, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import productService from '../services/productService';
import warehouseService from '../services/warehouseService';
import transactionService from '../services/transactionService';

export default function GoodsIssue() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);

  const [warehouses, setWarehouses] = useState([]);
  const [warehouseStock, setWarehouseStock] = useState({});

  useEffect(() => {
    const fetchInitData = async () => {
      try {
        const [prodRes, wareRes] = await Promise.all([
          productService.getAll(),
          warehouseService.getAll()
        ]);

        if (prodRes && prodRes.data) setProducts(prodRes.data);
        else if (Array.isArray(prodRes)) setProducts(prodRes);

        if (wareRes && wareRes.data) setWarehouses(wareRes.data);
        else if (Array.isArray(wareRes)) setWarehouses(wareRes);
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu ban đầu', error);
      }
    };
    fetchInitData();
  }, []);

  const getUserRole = () => {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      try { return JSON.parse(userStr).role; } catch (e) { }
    }
    return 'STAFF';
  };
  const currentUserRole = getUserRole();

  // Header form
  const [issueData, setIssueData] = useState({
    issueNo: `PX${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split('T')[0],
    personInCharge: 'Nguyễn Văn A',
    recipient: '',
    warehouseId: '',
    reason: ''
  });

  useEffect(() => {
    if (!issueData.warehouseId) {
      setWarehouseStock({});
      setItems(prev => prev.map(item => ({ ...item, currentStock: null })));
      return;
    }

    const fetchStock = async () => {
      try {
        const res = await warehouseService.getStock(issueData.warehouseId);
        const stockList = Array.isArray(res) ? res : (res?.data || []);

        const stockMap = {};
        stockList.forEach(s => {
          stockMap[s.productId] = s.quantity;
        });
        setWarehouseStock(stockMap);

        setItems(prev => prev.map(item => {
          if (item.productId) {
            const newStock = stockMap[item.productId] || 0;
            return { ...item, currentStock: newStock };
          }
          return item;
        }));
      } catch (err) {
        console.error(err);
      }
    };
    fetchStock();
  }, [issueData.warehouseId]);

  // Dynamic table items
  const [items, setItems] = useState([
    { id: Date.now(), productId: '', quantity: '', unit: '', currentStock: null }
  ]);

  const [status, setStatus] = useState('DRAFT'); // DRAFT or APPROVED
  const [error, setError] = useState('');

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setIssueData({ ...issueData, [name]: value });
  };

  const handleItemChange = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        let updatedItem = { ...item, [field]: value };

        // Auto update unit and currentStock when product changes
        if (field === 'productId') {
          const product = products.find(p => p.id === Number(value));
          if (product) {
            updatedItem.unit = product.unit;
            updatedItem.currentStock = issueData.warehouseId ? (warehouseStock[product.id] || 0) : null;

            // Auto clear quantity if the new selected product has 0 stock
            if (product.stock === 0) {
              updatedItem.quantity = '';
            }
          } else {
            updatedItem.unit = '';
            updatedItem.currentStock = null;
          }
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const addItemRow = () => {
    setItems([...items, { id: Date.now(), productId: '', quantity: '', unit: '', currentStock: null }]);
  };

  const removeItemRow = (id) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const validateForm = () => {
    setError('');
    if (!issueData.warehouseId) {
      setError('Vui lòng chọn Kho xuất.');
      return false;
    }
    if (!issueData.recipient.trim()) {
      setError('Vui lòng nhập Tên người nhận / Bộ phận nhận.');
      return false;
    }
    if (!issueData.reason.trim()) {
      setError('Vui lòng nhập Lý do xuất kho.');
      return false;
    }

    let hasValidItem = false;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productId) {
        setError(`Dòng ${i + 1}: Vui lòng chọn sản phẩm.`);
        return false;
      }

      const qty = Number(item.quantity);
      if (!qty || qty <= 0) {
        setError(`Dòng ${i + 1}: Số lượng xuất phải lớn hơn 0.`);
        return false;
      }

      if (item.currentStock !== null && qty > item.currentStock) {
        setError(`Dòng ${i + 1}: Vượt quá tồn kho! (Yêu cầu: ${qty}, Tồn kho: ${item.currentStock}).`);
        return false;
      }

      hasValidItem = true;
    }

    if (!hasValidItem) {
      setError('Phiếu xuất phải có ít nhất 1 sản phẩm hợp lệ.');
      return false;
    }

    // Check duplicate products in the same issue ticket (optional but good logical validation)
    const productIds = items.map(i => i.productId);
    const uniqueProductIds = new Set(productIds);
    if (productIds.length !== uniqueProductIds.size) {
      setError('Có sản phẩm bị trùng lặp trong danh sách xuất, vui lòng gộp lại số lượng.');
      return false;
    }

    return true;
  };

  const buildPayload = () => {
    return {
      orderCode: issueData.issueNo,
      warehouseId: Number(issueData.warehouseId),
      recipientName: issueData.recipient,
      recipientDepartment: '',
      note: issueData.reason,
      details: items.map(item => {
        const product = products.find(p => p.id === Number(item.productId));
        return {
          productId: Number(item.productId),
          quantity: Number(item.quantity),
          unitPrice: product && product.price ? Number(product.price) : 0,
          note: ''
        };
      })
    };
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    const loadingToast = toast.loading('Đang lưu phiếu xuất...');
    try {
      await transactionService.createExport(buildPayload());
      setStatus('DRAFT');
      toast.success('Đã LƯU phiếu xuất thành công. Sản phẩm chưa bị trừ trong kho.', { id: loadingToast });
      navigate('/transactions');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi lưu phiếu xuất', { id: loadingToast });
      setError(err.response?.data?.message || 'Lỗi khi lưu phiếu xuất');
    }
  };

  const handleApprove = async () => {
    if (currentUserRole !== 'ADMIN') {
      toast.error('Lỗi: Chỉ quản lý có quyền DUYỆT phiếu xuất kho!');
      return;
    }

    if (!validateForm()) return;
    const loadingToast = toast.loading('Đang xử lý duyệt phiếu xuất...');
    try {
      const res = await transactionService.createExport(buildPayload());
      const createdId = res.data?.id || res.id;
      await transactionService.updateExportStatus(createdId, 'COMPLETED');
      setStatus('APPROVED');
      toast.success('Phiếu xuất đã được DUYỆT thành công. Hệ thống đã trừ tồn kho.', { id: loadingToast, duration: 4000 });

      // Báo cho MainLayout kiểm tra tồn kho xem có rớt dưới ngưỡng không
      window.dispatchEvent(new Event('transaction_completed'));

      // Kiểm tra cục bộ ngay lập tức để đảm bảo thông báo hiện chuẩn xác khi chuyển trang
      const payload = buildPayload();
      if (payload.warehouseId) {
        warehouseService.getStock(payload.warehouseId).then(stockRes => {
          const stocks = stockRes.data || (Array.isArray(stockRes) ? stockRes : []);
          const exportedProductIds = payload.details.map(d => d.productId);
          const lowStockItems = stocks.filter(s =>
            exportedProductIds.includes(s.productId) &&
            s.minStockLevel !== undefined && s.minStockLevel !== null &&
            s.quantity < s.minStockLevel
          );

          if (lowStockItems.length > 0) {
            setTimeout(() => {
              lowStockItems.forEach(item => {
                const currentQty = Number(item.quantity);
                const msg = currentQty === 0
                  ? `Cảnh báo: Sản phẩm "${item.productName}" ĐÃ HẾT HÀNG!`
                  : `Cảnh báo: Sản phẩm "${item.productName}" sắp hết hàng (chỉ còn ${currentQty})!`;

                toast.error(msg, {
                  duration: 8000,
                  icon: '⚠️',
                  id: `low-stock-${item.warehouseId}-${item.productId}-${currentQty}`,
                  style: {
                    border: '1px solid #FFB020',
                    padding: '16px',
                    color: '#B7791F',
                    backgroundColor: '#FFFAF0',
                    maxWidth: '500px'
                  }
                });
              });
            }, 500);
          }
        }).catch(err => console.error(err));
      }

      navigate('/transactions');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi duyệt phiếu xuất', { id: loadingToast });
      setError(err.response?.data?.message || 'Lỗi khi duyệt phiếu xuất');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Tạo phiếu xuất kho</h1>

        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/transactions')}
            className="bg-gray-100 text-gray-600 border border-gray-200 px-4 py-2 rounded shadow-sm hover:bg-gray-200 transition flex items-center gap-2 font-medium"
          >
            <ArrowLeft size={18} />
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={status === 'APPROVED'}
            className="bg-white border border-primary text-primary px-4 py-2 rounded shadow hover:bg-gray-50 transition flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={20} />
            Lưu
          </button>
          <button
            onClick={handleApprove}
            disabled={status === 'APPROVED'}
            className="bg-danger text-white px-4 py-2 rounded shadow hover:bg-red-600 transition flex items-center gap-2 disabled:opacity-50"
          >
            <CheckCircle size={20} />
            {status === 'APPROVED' ? 'Đã Duyệt (Trừ Kho)' : 'Duyệt Phiếu Xuất'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 flex items-start gap-2" role="alert">
          <AlertCircle className="mt-0.5 flex-shrink-0" size={18} />
          <p>{error}</p>
        </div>
      )}

      {/* Header Info */}
      <div className="bg-surface rounded-lg shadow mb-6 p-5 border-l-4 border-l-orange-400">
        <h2 className="text-lg font-medium text-primary mb-4 border-b pb-2">Thông tin xuất kho</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="flex items-center gap-2 text-gray-700 font-medium mb-1">
              <FileText size={16} className="text-gray-400" />
              Số phiếu
            </label>
            <input
              type="text"
              name="issueNo"
              value={issueData.issueNo}
              disabled
              className="w-full bg-gray-100 border rounded px-3 py-2 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-gray-700 font-medium mb-1">
              <Calendar size={16} className="text-gray-400" />
              Ngày xuất
            </label>
            <input
              type="date"
              name="date"
              value={issueData.date}
              onChange={handleHeaderChange}
              disabled={status === 'APPROVED'}
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-gray-700 font-medium mb-1">
              <User size={16} className="text-gray-400" />
              Người thực hiện
            </label>
            <input
              type="text"
              name="personInCharge"
              value={issueData.personInCharge}
              onChange={handleHeaderChange}
              disabled={status === 'APPROVED'}
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-gray-700 font-medium mb-1">
              <PackageMinus size={16} className="text-gray-400" />
              Người nhận / Bộ phận <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="recipient"
              value={issueData.recipient}
              onChange={handleHeaderChange}
              disabled={status === 'APPROVED'}
              placeholder="Nhập tên người/nơi nhận"
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-orange-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-gray-700 font-medium mb-1">
              <FileText size={16} className="text-gray-400" />
              Kho xuất <span className="text-red-500">*</span>
            </label>
            <select
              name="warehouseId"
              value={issueData.warehouseId}
              onChange={handleHeaderChange}
              disabled={status === 'APPROVED'}
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-orange-400 focus:outline-none bg-white"
            >
              <option value="">-- Chọn kho --</option>
              {warehouses.filter(w => w.isActive !== false).map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-4">
            <label className="flex items-center gap-2 text-gray-700 font-medium mb-1">
              <Type size={16} className="text-gray-400" />
              Lý do xuất kho <span className="text-red-500">*</span>
            </label>
            <textarea
              name="reason"
              value={issueData.reason}
              onChange={handleHeaderChange}
              disabled={status === 'APPROVED'}
              placeholder="VD: Xuất hàng cho bếp, Xuất bán sự kiện..."
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-orange-400 focus:outline-none"
              rows="2"
            ></textarea>
          </div>
        </div>
      </div>

      {/* Dynamic Items Table */}
      <div className="bg-surface rounded-lg shadow p-5">
        <h2 className="text-lg font-medium text-primary mb-4 border-b pb-2">Hàng hóa xuất</h2>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left py-3 px-4 text-gray-600 font-medium w-4/12">Sản phẩm <span className="text-red-500">*</span></th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium w-2/12">Tồn kho hiện tại</th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium w-2/12">Đơn vị</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium w-3/12">Số lượng xuất <span className="text-red-500">*</span></th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium w-1/12">Xóa</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const qty = Number(item.quantity);
                const showWarning = item.currentStock !== null && qty > item.currentStock;

                return (
                  <tr key={item.id} className={`border-b transition ${showWarning ? 'bg-red-50' : ''}`}>
                    <td className="py-3 px-2">
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(item.id, 'productId', e.target.value)}
                        disabled={status === 'APPROVED'}
                        className={`w-full border rounded px-2 py-2 focus:ring-2 focus:outline-none bg-white ${showWarning ? 'border-red-300 focus:ring-red-400' : 'focus:ring-orange-400'}`}
                      >
                        <option value="">-- Chọn sản phẩm --</option>
                        {products.map(p => {
                          const s = issueData.warehouseId ? (warehouseStock[p.id] || 0) : null;
                          return (
                            <option key={p.id} value={p.id} disabled={s === 0}>
                              {p.code} - {p.name} {s === 0 ? '(Hết hàng/Chưa nhập)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`inline-block px-3 py-1 font-semibold rounded text-sm ${item.currentStock === 0 ? 'bg-red-100 text-red-700' : item.currentStock <= 10 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                        {item.currentStock !== null ? item.currentStock : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="text"
                        value={item.unit}
                        disabled
                        className="w-full bg-gray-50 border-none text-gray-500 rounded px-2 py-2 text-center"
                      />
                    </td>
                    <td className="py-3 px-2 text-right">
                      <input
                        type="number"
                        min="1"
                        max={item.currentStock !== null ? item.currentStock : undefined}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                        disabled={status === 'APPROVED' || item.currentStock === 0 || item.currentStock === null}
                        className={`w-full border rounded px-2 py-2 text-right focus:ring-2 focus:outline-none ${showWarning ? 'border-red-500 text-red-600 focus:ring-red-500 bg-white' : 'focus:ring-orange-400'}`}
                        placeholder="0"
                      />
                      {showWarning && (
                        <div className="text-red-500 text-xs mt-1 text-right">Vượt tồn kho!</div>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button
                        onClick={() => removeItemRow(item.id)}
                        disabled={items.length === 1 || status === 'APPROVED'}
                        className="text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed mx-auto"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex mt-4">
          <button
            onClick={addItemRow}
            disabled={status === 'APPROVED'}
            className="flex items-center gap-1 text-orange-500 hover:text-orange-600 font-medium disabled:opacity-50"
          >
            <Plus size={18} />
            Thêm dòng khác
          </button>
        </div>
      </div>
    </div>
  );
}
