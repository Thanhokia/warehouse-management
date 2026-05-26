import React, { useState, useEffect } from 'react';
import { Plus, Minus, Loader2, Eye, Search, Filter, Check, X, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import transactionService from '../services/transactionService';
import warehouseService from '../services/warehouseService';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/common/Pagination';
import { exportToExcel } from '../utils/exportUtils';

export default function Transactions() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmState, setConfirmState] = useState({ isOpen: false, tx: null, action: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [viewTx, setViewTx] = useState(null); // The transaction to view

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const ITEMS_PER_PAGE = 10;

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const [importRes, exportRes] = await Promise.all([
        transactionService.getAllImports(),
        transactionService.getAllExports()
      ]);

      const imports = importRes?.data || (Array.isArray(importRes) ? importRes : []);
      const exports = exportRes?.data || (Array.isArray(exportRes) ? exportRes : []);

      const formattedImports = imports.map(i => ({
        realId: i.id,
        id: i.orderCode,
        date: i.importDate || i.createdAt,
        type: 'IMPORT',
        status: i.status,
        person: i.createdByName || 'N/A',
        partner: i.supplierName || 'N/A',
        qtyDesc: (i.details?.length || 0) + ' mục',
        total: i.totalAmount || 0,
        rawDate: new Date(i.importDate || i.createdAt),
        details: i.details || []
      }));

      const formattedExports = exports.map(e => ({
        realId: e.id,
        id: e.orderCode,
        date: e.exportDate || e.createdAt,
        type: 'EXPORT',
        status: e.status,
        person: e.createdByName || 'N/A',
        partner: e.recipientName || 'N/A',
        qtyDesc: (e.details?.length || 0) + ' mục',
        total: e.totalAmount || 0,
        rawDate: new Date(e.exportDate || e.createdAt),
        details: e.details || []
      }));

      const combined = [...formattedImports, ...formattedExports];
      combined.sort((a, b) => b.rawDate - a.rawDate);

      // Format lại hiển thị ngày tháng
      combined.forEach(item => {
        if (item.date) {
          item.date = new Date(item.date).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          });
        }
      });

      setTransactions(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const openConfirmApprove = (tx) => {
    const userStr = sessionStorage.getItem('user');
    let role = 'STAFF';
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        role = user.role;
      } catch (e) { }
    }

    if (role !== 'ADMIN') {
      toast.error('Lỗi: Chỉ quản lý mới có quyền DUYỆT phiếu!');
      return;
    }

    setConfirmState({ isOpen: true, tx, action: 'APPROVE' });
  };

  const openConfirmCancel = (tx) => setConfirmState({ isOpen: true, tx, action: 'CANCEL' });
  const closeConfirm = () => setConfirmState({ isOpen: false, tx: null, action: null });

  const executeAction = async () => {
    const { tx, action } = confirmState;
    if (!tx) return;

    closeConfirm();
    const loadingToast = toast.loading(action === 'APPROVE' ? 'Đang duyệt phiếu...' : 'Đang hủy phiếu...');

    try {
      const newStatus = action === 'APPROVE' ? 'COMPLETED' : 'CANCELLED';
      if (tx.type === 'IMPORT') {
        await transactionService.updateImportStatus(tx.realId, newStatus);
      } else {
        await transactionService.updateExportStatus(tx.realId, newStatus);
      }
      let successMsg = '';
      if (action === 'APPROVE') {
        successMsg = tx.type === 'IMPORT'
          ? 'Phiếu nhập đã được DUYỆT thành công. Hàng hóa đã được cộng vào tồn kho.'
          : 'Phiếu xuất đã được DUYỆT thành công. Hệ thống đã trừ tồn kho.';
      } else {
        successMsg = tx.type === 'IMPORT'
          ? 'Phiếu nhập đã được HỦY thành công.'
          : 'Phiếu xuất đã được HỦY thành công.';
      }
      toast.success(successMsg, { id: loadingToast, duration: 4000 });
      fetchTransactions();

      // Kích hoạt event để MainLayout kiểm tra tồn kho ngay lập tức
      if (action === 'APPROVE') {
        window.dispatchEvent(new Event('transaction_completed'));

        // Kiểm tra cục bộ ngay lập tức để đảm bảo thông báo luôn hiện
        if (tx.type === 'EXPORT' && tx.warehouseId) {
          warehouseService.getStock(tx.warehouseId).then(stockRes => {
            const stocks = stockRes.data || (Array.isArray(stockRes) ? stockRes : []);
            const exportedProductIds = tx.details.map(d => d.productId);
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
      }
    } catch (err) {
      toast.error(err.response?.data?.message || (action === 'APPROVE' ? 'Lỗi khi duyệt phiếu' : 'Lỗi khi hủy phiếu'), { id: loadingToast });
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterStatus]);

  const handleExportExcel = () => {
    const data = filteredTransactions.map(item => ({
      'Mã phiếu': item.id,
      'Ngày tạo': item.rawDate.toLocaleDateString('vi-VN') + ' ' + item.rawDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      'Loại': item.type === 'IMPORT' ? 'Nhập kho' : 'Xuất kho',
      'Số mục': item.qtyDesc,
      'Trạng thái': item.status === 'PENDING' ? 'Chờ duyệt' : item.status === 'APPROVED' ? 'Đã duyệt' : item.status === 'COMPLETED' ? 'Hoàn thành' : 'Đã hủy',
      'Người tạo': item.person,
      'Đối tác': item.partner
    }));
    exportToExcel(data, `LichSuGiaoDich_${new Date().getTime()}`);
  };

  // Compute filtered transactions
  const filteredTransactions = transactions.filter(tx => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (tx.id && tx.id.toLowerCase().includes(searchLower)) ||
      (tx.person && tx.person.toLowerCase().includes(searchLower)) ||
      (tx.partner && tx.partner.toLowerCase().includes(searchLower));

    const matchesType = filterType === 'ALL' || tx.type === filterType;
    const matchesStatus = filterStatus === 'ALL' || tx.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  // Ensure current page is valid after filtering
  const safeCurrentPage = Math.min(currentPage, totalPages > 0 ? totalPages : 1);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>

          <h1 className="text-2xl font-semibold text-primary">Quản lý Nhập và Xuất kho</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            disabled={filteredTransactions.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 text-sm"
          >
            <FileSpreadsheet size={16} />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={() => navigate('/import')}
            className="bg-white border text-green-600 border-green-200 px-4 py-2 flex items-center gap-2 rounded shadow-sm hover:bg-green-50 transition font-medium"
          >
            <Plus size={18} />
            Nhập hàng mới
          </button>
          <button
            onClick={() => navigate('/export')}
            className="bg-primary text-white border border-primary px-4 py-2 flex items-center gap-2 rounded shadow-sm hover:bg-primary-light transition font-medium"
          >
            <Minus size={18} />
            Xuất hàng mới
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-6 mt-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Lịch sử nhập xuất kho</h2>

          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Tìm kiếm mã giao dịch, người phụ trách, đối tác..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
            <Search className="absolute left-3.5 top-2.5 text-gray-400" size={18} />
          </div>

          <div className="flex gap-4">
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer text-gray-700 transition"
              >
                <option value="ALL">Loại: Tất cả</option>
                <option value="IMPORT">Nhập hàng</option>
                <option value="EXPORT">Xuất hàng</option>
              </select>
              <Filter className="absolute left-3.5 top-2.5 text-gray-400" size={16} />
            </div>

            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer text-gray-700 transition"
              >
                <option value="ALL">Trạng thái: Tất cả</option>
                <option value="PENDING">Chờ duyệt</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
              <Filter className="absolute left-3.5 top-2.5 text-gray-400" size={16} />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="overflow-x-auto w-full">
<table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-100 whitespace-nowrap">
                <th className="text-left py-4 px-2 text-gray-600 font-semibold w-[10%]">Mã giao dịch</th>
                <th className="text-left py-4 px-2 text-gray-600 font-semibold w-[12%]">Ngày</th>
                <th className="text-left py-4 px-2 text-gray-600 font-semibold w-[10%]">Loại</th>
                <th className="text-left py-4 px-2 text-gray-600 font-semibold w-[10%]">Trạng thái</th>
                <th className="text-left py-4 px-2 text-gray-600 font-semibold w-[15%]">Người phụ trách</th>
                <th className="text-left py-4 px-2 text-gray-600 font-semibold w-[15%]">Đối tác</th>
                <th className="text-left py-4 px-2 text-gray-600 font-semibold w-[8%]">Số lượng</th>
                <th className="text-right py-4 px-2 text-gray-600 font-semibold w-[10%]">Tổng giá trị</th>
                <th className="text-center py-4 px-2 text-gray-600 font-semibold w-[10%]">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="text-center py-10">
                    <Loader2 className="animate-spin text-primary mx-auto mb-2" size={32} />
                    <p className="text-gray-500">Đang tải lịch sử nhập xuất...</p>
                  </td>
                </tr>
              ) : paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((tx, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                    <td className="py-4 px-2 font-medium text-gray-800">{tx.id}</td>
                    <td className="py-4 px-2 text-gray-600">{tx.date}</td>
                    <td className="py-4 px-2 whitespace-nowrap">
                      {tx.type === 'IMPORT' ? (
                        <span className="text-green-600 px-2 py-1 text-xs font-semibold">Nhập hàng</span>
                      ) : (
                        <span className="text-blue-600 px-2 py-1 text-xs font-semibold">Xuất hàng</span>
                      )}
                    </td>
                    <td className="py-4 px-2 whitespace-nowrap">
                      {tx.status === 'PENDING' ? (
                        <span className="text-orange-600 px-2 py-1 text-xs font-semibold">Chờ duyệt</span>
                      ) : tx.status === 'COMPLETED' ? (
                        <span className="text-emerald-600 px-2 py-1 text-xs font-semibold">Hoàn thành</span>
                      ) : tx.status === 'CANCELLED' ? (
                        <span className="text-red-600 px-2 py-1 text-xs font-semibold">Đã hủy</span>
                      ) : (
                        <span className="text-gray-600 px-2 py-1 text-xs font-semibold">{tx.status}</span>
                      )}
                    </td>
                    <td className="py-4 px-2 text-gray-600 truncate">{tx.person}</td>
                    <td className="py-4 px-2 text-gray-600 truncate">{tx.partner}</td>
                    <td className="py-4 px-2 text-gray-600">{tx.qtyDesc}</td>
                    <td className="py-4 px-2 text-right font-semibold text-gray-800 text-sm">
                      ₫{tx.total.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-4 px-2 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => setViewTx(tx)}
                          className="text-gray-400 hover:text-blue-600 transition"
                          title="Xem chi tiết"
                        >
                          <Eye size={18} />
                        </button>
                        {tx.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => openConfirmApprove(tx)}
                              className="text-gray-400 hover:text-green-600 transition"
                              title="Duyệt"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={() => openConfirmCancel(tx)}
                              className="text-gray-400 hover:text-red-600 transition"
                              title="Hủy phiếu"
                            >
                              <X size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">Không có giao dịch nào gần đây.</td>
                </tr>
              )}
            </tbody>
          </table>
</div>
        </div>

        {/* Pagination */}
        {!isLoading && filteredTransactions.length > 0 && (
          <Pagination
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.action === 'APPROVE' ? 'Xác nhận Duyệt phiếu' : 'Xác nhận Hủy phiếu'}
        message={
          confirmState.action === 'APPROVE'
            ? `Bạn có chắc muốn duyệt phiếu ${confirmState.tx?.id}? Hàng hóa sẽ được cộng/trừ vào tồn kho ngay lập tức.`
            : `Bạn có chắc chắn muốn HỦY phiếu ${confirmState.tx?.id} không?`
        }
        onConfirm={executeAction}
        onCancel={closeConfirm}
        confirmText={confirmState.action === 'APPROVE' ? 'Duyệt phiếu' : 'Hủy phiếu'}
        confirmColor={confirmState.action === 'APPROVE' ? 'bg-primary hover:bg-primary-dark' : 'bg-red-500 hover:bg-red-600'}
      />

      {/* View Details Modal */}
      {viewTx && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Chi tiết {viewTx.type === 'IMPORT' ? 'Phiếu Nhập' : 'Phiếu Xuất'}
                </h2>
                <p className="text-gray-500 text-sm mt-1">Mã phiếu: <span className="font-semibold text-gray-700">{viewTx.id}</span></p>
              </div>
              <button onClick={() => setViewTx(null)} className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div>
                  <p className="text-sm text-gray-500">Đối tác:</p>
                  <p className="font-medium text-gray-800">{viewTx.partner}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Người tạo:</p>
                  <p className="font-medium text-gray-800">{viewTx.person}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Thời gian:</p>
                  <p className="font-medium text-gray-800">{viewTx.date}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Trạng thái:</p>
                  <div>
                    {viewTx.status === 'PENDING' ? (
                      <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-semibold">Chờ duyệt</span>
                    ) : viewTx.status === 'COMPLETED' ? (
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-semibold">Hoàn thành</span>
                    ) : viewTx.status === 'CANCELLED' ? (
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold">Đã hủy</span>
                    ) : (
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-semibold">{viewTx.status}</span>
                    )}
                  </div>
                </div>
              </div>

              <h3 className="font-semibold text-gray-800 mb-3 border-b pb-2">Danh sách hàng hóa</h3>
              <div className="overflow-x-auto border rounded-lg">
                <div className="overflow-x-auto w-full">
<table className="w-full border-collapse text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Mã SP</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Tên Sản phẩm</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Số lượng</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Đơn giá</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewTx.details && viewTx.details.length > 0 ? viewTx.details.map((item, idx) => (
                      <tr key={idx} className="border-t hover:bg-gray-50 transition">
                        <td className="py-3 px-4 text-gray-700">{item.productCode || '-'}</td>
                        <td className="py-3 px-4 font-medium text-gray-800">{item.productName || 'Sản phẩm ' + item.productId}</td>
                        <td className="py-3 px-4 text-right font-medium">{item.quantity}</td>
                        <td className="py-3 px-4 text-right text-gray-600">₫{(item.unitPrice || 0).toLocaleString('vi-VN')}</td>
                        <td className="py-3 px-4 text-right font-medium text-primary">₫{((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString('vi-VN')}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="5" className="py-6 text-center text-gray-500">Không có dữ liệu chi tiết.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
</div>
              </div>
              <div className="mt-4 flex justify-end text-lg">
                <span className="text-gray-600 mr-3">Tổng cộng:</span>
                <span className="font-bold text-primary">₫{viewTx.total.toLocaleString('vi-VN')}</span>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setViewTx(null)}
                className="px-5 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition font-medium"
              >
                Đóng
              </button>
              {viewTx.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => {
                      setViewTx(null);
                      openConfirmCancel(viewTx);
                    }}
                    className="px-5 py-2 border border-red-200 bg-red-50 text-red-600 rounded hover:bg-red-100 transition font-medium"
                  >
                    Hủy phiếu
                  </button>
                  <button
                    onClick={() => {
                      setViewTx(null);
                      openConfirmApprove(viewTx);
                    }}
                    className="px-5 py-2 bg-primary text-white rounded hover:bg-primary-dark shadow-sm transition font-medium"
                  >
                    Duyệt phiếu
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
