import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  List,
  Package,
  Warehouse,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Users,
  LogOut,
  KeyRound,
  PieChart
} from 'lucide-react';
import authService from '../../services/authService';
import ChangePasswordModal from '../ChangePasswordModal';

export default function Sidebar() {
  const menuItems = [
    { name: 'Tổng quan', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Danh mục', path: '/categories', icon: <List size={20} /> },
    { name: 'Sản phẩm', path: '/products', icon: <Package size={20} /> },
    { name: 'Kho hàng', path: '/warehouses', icon: <Warehouse size={20} /> },
    { name: 'Nhập/Xuất kho', path: '/transactions', icon: <ArrowDownToLine size={20} /> },
    { name: 'Tồn kho', path: '/inventory', icon: <Boxes size={20} /> },
    { name: 'Báo cáo - Thống kê', path: '/reports', icon: <PieChart size={20} /> },
  ];

  if (authService.getCurrentUser()?.role === 'ADMIN') {
    menuItems.push({ name: 'Người dùng', path: '/users', icon: <Users size={20} /> });
  }

  const navigate = useNavigate();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const currentUser = authService.getCurrentUser() || { name: 'Người Dùng', role: 'STAFF' };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <div className="w-64 bg-primary text-white min-h-screen fixed left-0 top-0 z-10 flex flex-col shadow-xl">
      <div className="p-6 text-center border-b border-primary-light/30 flex flex-col items-center">
        <img src="/logo.png.jpg" alt="Zô Zô Quán" className="w-20 h-20 object-cover rounded-full border-2 border-white/20 shadow-md mb-3 bg-red-800" />
        <h2 className="text-xl font-bold uppercase tracking-wider">ZôZô Quán</h2>
        <p className="text-sm text-blue-200 mt-1">Hệ thống quản lý kho</p>
      </div>

      <nav className="flex-1 py-6">
        <ul className="space-y-2 px-4">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {item.icon}
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Info & Logout (Bottom) */}
      <div className="p-4 border-t border-primary-light/30 mt-auto">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-primary font-bold">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium">{currentUser.name}</p>
            <p className="text-xs text-blue-300">{currentUser.role === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên'}</p>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => setIsChangePasswordOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <KeyRound size={20} />
            <span className="font-medium">Đổi mật khẩu</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-blue-200 hover:text-white hover:bg-red-500/80 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Đăng xuất</span>
          </button>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
}
