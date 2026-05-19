import React, { useState } from 'react';
import { X, Lock, KeyRound, Loader2, AlertCircle } from 'lucide-react';
import authService from '../services/authService';
import toast from 'react-hot-toast';

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.oldPassword) {
      setError('Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    
    if (!formData.newPassword) {
      setError('Vui lòng nhập mật khẩu mới');
      return;
    }
    
    if (formData.newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsLoading(true);
    try {
      await authService.changePassword(formData.oldPassword, formData.newPassword);
      toast.success('Đổi mật khẩu thành công!');
      
      // Reset form and close
      setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi đổi mật khẩu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full text-primary">
              <KeyRound size={20} />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Đổi Mật Khẩu</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 hover:bg-gray-200 p-1.5 rounded-full transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-5 bg-red-50 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2 text-sm border border-red-100">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1.5">Mật khẩu hiện tại</label>
              <div className="relative">
                <input
                  type="password"
                  name="oldPassword"
                  value={formData.oldPassword}
                  onChange={handleChange}
                  placeholder="Nhập mật khẩu hiện tại"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                  disabled={isLoading}
                />
                <Lock size={18} className="absolute left-3.5 top-3 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1.5">Mật khẩu mới</label>
              <div className="relative">
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Mật khẩu ít nhất 6 ký tự"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                  disabled={isLoading}
                />
                <KeyRound size={18} className="absolute left-3.5 top-3 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1.5">Xác nhận mật khẩu mới</label>
              <div className="relative">
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                  disabled={isLoading}
                />
                <Lock size={18} className="absolute left-3.5 top-3 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-5 py-2.5 border rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark shadow-sm transition flex items-center gap-2 min-w-[140px] justify-center"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                'Đổi mật khẩu'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
