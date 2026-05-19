import React, { useState } from 'react';
import authService from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { Package, Lock, User, LogIn, AlertCircle } from 'lucide-react';

export default function Login() {
  const [formData, setFormData] = useState({
    username: '', // Có thể là email hoặc username
    password: '',
    rememberMe: false
  });

  const [errors, setErrors] = useState({ username: '', password: '' });
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const validate = () => {
    let isValid = true;
    const newErrors = { username: '', password: '' };

    if (!formData.username.trim()) {
      newErrors.username = 'Vui lòng nhập tài khoản';
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải chứa ít nhất 6 ký tự';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);
    setApiError('');

    try {
      const response = await authService.login(formData.username, formData.password);

      // Backend trả về dạng ApiResponse, payload thực nằm trong response.data
      if (response && response.data && response.data.token) {
        sessionStorage.setItem('token', response.data.token);
        // Lưu thông tin user nếu có
        if (response.data.role) {
          sessionStorage.setItem('user', JSON.stringify({
            id: response.data.userId,
            username: response.data.username,
            name: response.data.fullName || response.data.username,
            role: response.data.role
          }));
        } else {
          // Lưu tạm một mock user để test UI nếu backend không trả về
          sessionStorage.setItem('user', JSON.stringify({ name: 'Admin', role: 'ADMIN' }));
        }

        // Điều hướng chung về dashboard cho cả nhân viên và quản lý
        navigate('/');
      } else {
        setApiError('Phản hồi từ máy chủ không hợp lệ.');
      }
    } catch (err) {
      // Bắt lỗi từ server hoặc network
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        setApiError('Sai tài khoản hoặc mật khẩu');
      } else {
        setApiError('Có lỗi xảy ra kết nối đến máy chủ. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">

        {/* Header Section */}
        <div className="bg-primary px-8 py-10 text-center text-white">
          <div className="flex justify-center mb-3">
            <img src="/logo.png.jpg" alt="Zô Zô Quán" className="w-24 h-24 object-cover rounded-full border-4 border-white/20 shadow-lg bg-red-800" />
          </div>
          <h1 className="text-2xl font-bold tracking-wide mt-2">Zô Zô Quán</h1>
          <p className="text-blue-200 text-sm mt-1">Hệ thống Quản lý Kho</p>
        </div>

        {/* Form Section */}
        <div className="p-8">
          {apiError && (
            <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2 text-sm border border-red-100">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1.5" htmlFor="username">
                Email hoặc Tên đăng nhập
              </label>
              <div className="relative">
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Nhập email hoặc tên đăng nhập"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border ${errors.username ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-primary focus:ring-primary/20'} focus:ring-2 focus:outline-none transition-all bg-gray-50 focus:bg-white`}
                  disabled={isLoading}
                />
                <User size={18} className={`absolute left-3.5 top-3.5 ${errors.username ? 'text-red-400' : 'text-gray-400'}`} />
              </div>
              {errors.username && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.username}</p>}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-gray-700 text-sm font-medium" htmlFor="password">
                  Mật khẩu
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Nhập mật khẩu"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border ${errors.password ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-primary focus:ring-primary/20'} focus:ring-2 focus:outline-none transition-all bg-gray-50 focus:bg-white`}
                  disabled={isLoading}
                />
                <Lock size={18} className={`absolute left-3.5 top-3.5 ${errors.password ? 'text-red-400' : 'text-gray-400'}`} />
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.password}</p>}
            </div>

            <div className="flex items-center justify-between mt-6 mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2 accent-primary transition"
                  disabled={isLoading}
                />
                <span className="text-sm text-gray-600 select-none">Ghi nhớ đăng nhập</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-xl shadow-md hover:shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn size={20} />
                  Đăng nhập
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
