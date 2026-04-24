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
        rawDate: new Date(i.importDate || i.createdAt)
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
        rawDate: new Date(e.exportDate || e.createdAt)
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
    </div>
  );
}
