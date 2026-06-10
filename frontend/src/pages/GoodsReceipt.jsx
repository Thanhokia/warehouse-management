import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, CheckCircle, FileText, Calendar, User, Truck, Type, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import productService from '../services/productService';
import warehouseService from '../services/warehouseService';
import transactionService from '../services/transactionService';

export default function GoodsReceipt() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialProductId = location.state?.productId;

  const [products, setProducts] = useState([]);

  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, wareRes] = await Promise.all([
          productService.getAll(),
          warehouseService.getAll()
        ]);
        let productList = [];
        if (prodRes && prodRes.data) productList = prodRes.data;
        else if (Array.isArray(prodRes)) productList = prodRes;

        setProducts(productList);

        if (initialProductId) {
          const product = productList.find(p => p.id === Number(initialProductId));
          if (product) {
            setItems(prev => prev.map((item, index) => {
              if (index === 0) {
                return { ...item, productId: initialProductId, unit: product.unit || '', price: product.price || '' };
              }
              return item;
            }));
          }
        }

        if (wareRes && wareRes.data) setWarehouses(wareRes.data);
        else if (Array.isArray(wareRes)) setWarehouses(wareRes);
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu', error);
      }
    };
    fetchData();
  }, []);

  const getUserData = () => {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      try { return JSON.parse(userStr); } catch (e) { }
    }
    return { role: 'STAFF', name: 'Nhân viên' };
  };
  const currentUser = getUserData();
  const currentUserRole = currentUser.role;

  // Header form
  const [receiptData, setReceiptData] = useState({
    receiptNo: `PN${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split('T')[0],
    personInCharge: currentUser.name || 'Nhân viên',
    supplier: '',
    warehouseId: '',
    notes: ''
  });

  // Dynamic table items
  const [items, setItems] = useState([
    { id: Date.now(), productId: initialProductId || '', quantity: '', price: '', unit: '' }
  ]);

  const [status, setStatus] = useState('DRAFT'); // DRAFT or APPROVED
  const [error, setError] = useState('');

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setReceiptData({ ...receiptData, [name]: value });
  };

  const handleItemChange = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        let updatedItem = { ...item, [field]: value };
        // Auto update unit and price when product changes
        if (field === 'productId') {
          const product = products.find(p => p.id === Number(value));
          updatedItem.unit = product ? product.unit : '';
          updatedItem.price = product ? product.price : '';
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const addItemRow = () => {
    setItems([...items, { id: Date.now(), productId: '', quantity: '', price: '', unit: '' }]);
  };

  const removeItemRow = (id) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const validateForm = () => {
    setError('');
    if (!receiptData.warehouseId) {
      setError('Vui lòng chọn Kho nhập.');
      return false;
    }
    if (!receiptData.supplier.trim()) {
      setError('Vui lòng nhập Tên/Mã Nhà cung cấp.');
      return false;
    }

    let hasValidItem = false;
    for (let item of items) {
      if (!item.productId) {
        setError('Tất cả dòng sản phẩm phải được chọn.');
        return false;
      }
      if (!item.quantity || Number(item.quantity) <= 0) {
        setError('Số lượng phải lớn hơn 0.');
        return false;
      }
      if (!item.price || Number(item.price) < 0) {
        setError('Giá nhập không được nhỏ hơn 0.');
        return false;
      }
      hasValidItem = true;
    }

    if (!hasValidItem) {
      setError('Phiếu nhập phải có ít nhất 1 sản phẩm.');
      return false;
    }

    return true;
  };

  const buildPayload = () => {
    return {
      orderCode: receiptData.receiptNo,
      warehouseId: Number(receiptData.warehouseId),
      supplierName: receiptData.supplier,
      note: receiptData.notes,
      details: items.map(item => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        unitPrice: Number(item.price) || 0,
        note: ''
      }))
    };
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    const loadingToast = toast.loading('Đang lưu phiếu nhập...');
    try {
      await transactionService.createImport(buildPayload());
      setStatus('DRAFT');
      toast.success('Đã LƯU phiếu nhập thành công (Trạng thái: Tạm lưu).', { id: loadingToast });
      navigate('/transactions');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi lưu phiếu nhập', { id: loadingToast });
      setError(err.response?.data?.message || 'Lỗi khi lưu phiếu nhập');
    }
  };

  const handleApprove = async () => {
    if (currentUserRole !== 'ADMIN') {
      toast.error('Lỗi: Chỉ quản lý mới có quyền DUYỆT phiếu!');
      return;
    }

    if (!validateForm()) return;
    const loadingToast = toast.loading('Đang xử lý duyệt phiếu nhập...');
    try {
      const res = await transactionService.createImport(buildPayload());
      const createdId = res.data?.id || res.id;
      await transactionService.updateImportStatus(createdId, 'COMPLETED');
      setStatus('APPROVED');
      toast.success('Phiếu nhập đã được DUYỆT thành công. Hàng hóa đã được cộng vào tồn kho.', { id: loadingToast, duration: 4000 });
      navigate('/transactions');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi duyệt phiếu nhập', { id: loadingToast });
      setError(err.response?.data?.message || 'Lỗi khi duyệt phiếu nhập');
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const q = Number(item.quantity) || 0;
      const p = Number(item.price) || 0;
      return sum + (q * p);
    }, 0);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Tạo phiếu nhập kho</h1>

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
            className="bg-success text-white px-4 py-2 rounded shadow hover:bg-emerald-600 transition flex items-center gap-2 disabled:opacity-50"
          >
            <CheckCircle size={20} />
            {status === 'APPROVED' ? 'Đã Duyệt' : 'Duyệt Phiếu'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}

      {/* Header Info */}
      <div className="bg-surface rounded-lg shadow mb-6 p-5">
        <h2 className="text-lg font-medium text-primary mb-4 border-b pb-2">Thông tin chung</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="flex items-center gap-2 text-gray-700 font-medium mb-1">
              <FileText size={16} className="text-gray-400" />
              Số phiếu
            </label>
            <input
              type="text"
              name="receiptNo"
              value={receiptData.receiptNo}
              disabled
              className="w-full bg-gray-100 border rounded px-3 py-2 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-gray-700 font-medium mb-1">
              <Calendar size={16} className="text-gray-400" />
              Ngày nhập
            </label>
            <input
              type="date"
              name="date"
              value={receiptData.date}
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
              value={receiptData.personInCharge}
              onChange={handleHeaderChange}
              disabled={status === 'APPROVED'}
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-gray-700 font-medium mb-1">
              <Truck size={16} className="text-gray-400" />
              Nhà cung cấp <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="supplier"
              value={receiptData.supplier}
              onChange={handleHeaderChange}
              disabled={status === 'APPROVED'}
              placeholder="Nhập tên nhà cung cấp"
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-gray-700 font-medium mb-1">
              <FileText size={16} className="text-gray-400" />
              Kho nhập <span className="text-red-500">*</span>
            </label>
            <select
              name="warehouseId"
              value={receiptData.warehouseId}
              onChange={handleHeaderChange}
              disabled={status === 'APPROVED'}
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none bg-white"
            >
              <option value="">-- Chọn kho --</option>
              {warehouses.filter(w => !w.name.includes('_deleted_') && w.isActive !== false).map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-4">
            <label className="flex items-center gap-2 text-gray-700 font-medium mb-1">
              <Type size={16} className="text-gray-400" />
              Ghi chú
            </label>
            <textarea
              name="notes"
              value={receiptData.notes}
              onChange={handleHeaderChange}
              disabled={status === 'APPROVED'}
              placeholder="Ghi chú thêm (nếu có)"
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
              rows="2"
            ></textarea>
          </div>
        </div>
      </div>

      {/* Dynamic Items Table */}
      <div className="bg-surface rounded-lg shadow p-5">
        <h2 className="text-lg font-medium text-primary mb-4 border-b pb-2">Danh sách sản phẩm</h2>

        <div className="overflow-x-auto">
          <div className="overflow-x-auto w-full">
<table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left py-3 px-4 text-gray-600 font-medium w-3/12">Sản phẩm <span className="text-red-500">*</span></th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium w-1/12">Đơn vị</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium w-2/12">Số lượng <span className="text-red-500">*</span></th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium w-3/12">Giá nhập (VNĐ) <span className="text-red-500">*</span></th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium w-2/12">Thành tiền</th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium w-1/12">Xóa</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const itemTotal = (Number(item.quantity) || 0) * (Number(item.price) || 0);
                return (
                  <tr key={item.id} className="border-b transition">
                    <td className="py-3 px-2">
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(item.id, 'productId', e.target.value)}
                        disabled={status === 'APPROVED'}
                        className="w-full border rounded px-2 py-2 focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                      >
                        <option value="">-- Chọn sản phẩm --</option>
                        {products.filter(p => !p.name.includes('_deleted_') && p.isActive !== false).map(p => (
                          <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="text"
                        value={item.unit}
                        disabled
                        className="w-full bg-gray-100 border text-gray-500 rounded px-2 py-2 text-center"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                        disabled={status === 'APPROVED'}
                        className="w-full border rounded px-2 py-2 text-right focus:ring-2 focus:ring-primary focus:outline-none"
                        placeholder="0"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min="0"
                        value={item.price}
                        onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                        disabled={status === 'APPROVED'}
                        className="w-full border rounded px-2 py-2 text-right focus:ring-2 focus:ring-primary focus:outline-none"
                        placeholder="0"
                      />
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-700">
                      {itemTotal.toLocaleString('vi-VN')}
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
        </div>

        <div className="flex justify-between items-center mt-4">
          <button
            onClick={addItemRow}
            disabled={status === 'APPROVED'}
            className="flex items-center gap-1 text-primary hover:text-primary-light font-medium disabled:opacity-50"
          >
            <Plus size={18} />
            Thêm dòng
          </button>

          <div className="text-xl font-semibold">
            <span className="text-gray-600 mr-4">Tổng cộng:</span>
            <span className="text-primary">{calculateTotal().toLocaleString('vi-VN')} VNĐ</span>
          </div>
        </div>
      </div>
    </div>
  );
}
