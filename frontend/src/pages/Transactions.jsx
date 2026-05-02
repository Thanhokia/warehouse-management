import React, { useState, useEffect } from 'react';
import { Plus, Minus, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import transactionService from '../services/transactionService';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/common/Pagination';

export default function Transactions() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmState, setConfirmState] = useState({ isOpen: false, tx: null, action: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [viewTx, setViewTx] = useState(null); // The transaction to view
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
      } catch (e) {}
    }
    
    if (role !== 'MANAGER' && role !== 'ADMIN') {
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
      toast.success(action === 'APPROVE' ? 'Đã duyệt phiếu thành công!' : 'Đã hủy phiếu thành công!', { id: loadingToast });
      fetchTransactions();
    } catch (err) {
      toast.error(err.response?.data?.message || (action === 'APPROVE' ? 'Lỗi khi duyệt phiếu' : 'Lỗi khi hủy phiếu'), { id: loadingToast });
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTransactions = transactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary">Giao dịch Nhập / Xuất</h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý phiếu nhập và xuất kho</p>
        </div>
        <div className="flex gap-3">
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
        <h2 className="text-lg font-semibold text-gray-800">Giao dịch gần đây</h2>
        <p className="text-gray-500 text-sm mb-6">Lịch sử nhập xuất kho mới nhất</p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-4 px-2 text-gray-600 font-semibold w-[15%]">Mã giao dịch</th>
                <th className="text-left py-4 px-2 text-gray-600 font-semibold w-[15%]">Ngày</th>
                <th className="text-left py-4 px-2 text-gray-600 font-semibold w-[15%]">Loại</th>
                <th className="text-left py-4 px-2 text-gray-600 font-semibold w-[10%]">Trạng thái</th>
                <th className="text-left py-4 px-2 text-gray-600 font-semibold w-[15%]">Người phụ trách</th>
                <th className="text-left py-4 px-2 text-gray-600 font-semibold w-[15%]">Đối tác</th>
                <th className="text-left py-4 px-2 text-gray-600 font-semibold w-[10%]">Số lượng</th>
                <th className="text-right py-4 px-2 text-gray-600 font-semibold w-[10%]">Tổng giá trị</th>
                <th className="text-center py-4 px-2 text-gray-600 font-semibold w-[10%]">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="text-center py-10">
                    <Loader2 className="animate-spin text-primary mx-auto mb-2" size={32} />
                    <p className="text-gray-500">Đang tải lịch sử giao dịch...</p>
                  </td>
                </tr>
              ) : paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((tx, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                    <td className="py-4 px-2 font-medium text-gray-800">{tx.id}</td>
                    <td className="py-4 px-2 text-gray-600">{tx.date}</td>
                    <td className="py-4 px-2">
                      {tx.type === 'IMPORT' ? (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">Nhập hàng</span>
                      ) : (
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">Xuất hàng</span>
                      )}
                    </td>
                    <td className="py-4 px-2">
                      {tx.status === 'PENDING' ? (
                        <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-semibold">Chờ duyệt</span>
                      ) : tx.status === 'COMPLETED' ? (
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-semibold">Hoàn thành</span>
                      ) : tx.status === 'CANCELLED' ? (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold">Đã hủy</span>
                      ) : (
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-semibold">{tx.status}</span>
                      )}
                    </td>
                    <td className="py-4 px-2 text-gray-600 truncate">{tx.person}</td>
                    <td className="py-4 px-2 text-gray-600 truncate">{tx.partner}</td>
                    <td className="py-4 px-2 text-gray-600">{tx.qtyDesc}</td>
                    <td className="py-4 px-2 text-right font-semibold text-gray-800 text-sm">
                      ₫{tx.total.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-4 px-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => setViewTx(tx)}
                          className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 rounded text-xs font-medium hover:bg-blue-100 transition"
                        >
                          Xem
                        </button>
                        {tx.status === 'PENDING' && (
                          <button 
                            onClick={() => openConfirmApprove(tx)}
                            className="bg-primary text-white px-3 py-1 rounded text-xs font-medium hover:bg-primary-dark transition"
                          >
                            Duyệt
                          </button>
                        )}
                        {tx.status === 'PENDING' && (
                          <button 
                            onClick={() => openConfirmCancel(tx)}
                            className="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded text-xs font-medium hover:bg-red-100 transition"
                          >
                            Hủy phiếu
                          </button>
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
        
        {/* Pagination */}
        {!isLoading && transactions.length > 0 && (
          <Pagination 
            currentPage={currentPage}
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
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
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
