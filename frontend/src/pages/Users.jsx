import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, Shield, ShieldCheck, Mail, User, Loader2, Activity, CheckCircle2, Info, AlertCircle, Clock } from 'lucide-react';
import userService from '../services/userService';
import activityService from '../services/activityService';
import authService from '../services/authService';
import Pagination from '../components/common/Pagination';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [currentActivityPage, setCurrentActivityPage] = useState(1);
  const ACTIVITIES_PER_PAGE = 10;

  // Lấy thông tin user thực tế đang đăng nhập (để validate không cho xóa chính mình)
  const currentUser = authService.getCurrentUser() || {};
  const currentUsername = currentUser.username || currentUser.email || '';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({ username: '', fullName: '', email: '@gmail.com', role: 'STAFF', password: '' });
  const [error, setError] = useState('');

  const filteredUsers = users.filter(u =>
    u.isActive !== false && (
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
    )
  );

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username || '',
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        password: '' // Không hiện password cũ lúc sửa
      });
    } else {
      setEditingUser(null);
      setFormData({ username: '', fullName: '', email: '@gmail.com', role: 'STAFF', password: '' });
    }
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError('');
  };

  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await userService.getAll();
      if (res && res.data) setUsers(res.data);
      else if (Array.isArray(res)) setUsers(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const res = await activityService.getAll();
      if (res && res.data) setActivities(res.data);
      else if (Array.isArray(res)) setActivities(res);
    } catch (err) {
      console.error("Lỗi khi tải nhật ký hoạt động:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchActivities();
  }, []);

  const getActivityStyling = (status) => {
    switch (status) {
      case 'Thành công':
        return { color: 'bg-green-100 text-green-700', icon: <CheckCircle2 size={20} className="text-green-500" /> };
      case 'Cảnh báo':
        return { color: 'bg-orange-100 text-orange-700', icon: <AlertCircle size={20} className="text-orange-500" /> };
      case 'Thông tin':
      default:
        return { color: 'bg-blue-100 text-blue-700', icon: <Info size={20} className="text-blue-500" /> };
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return { time: '', date: '' };
    const date = new Date(dateString);
    const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }).replace('AM', 'SA').replace('PM', 'CH');

    const today = new Date();
    const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();

    return {
      time: time,
      date: isToday ? 'Hôm nay' : date.toLocaleDateString('vi-VN')
    };
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.fullName.trim() || !formData.email.trim()) {
      setError('Tên đăng nhập, Họ tên và Email không được để trống.');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Định dạng email không hợp lệ.');
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      setError('Mật khẩu không được để trống khi tạo mới người dùng.');
      return;
    }

    try {
      const payload = {
        username: formData.username.trim(),
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        role: formData.role,
        ...(formData.password && { password: formData.password })
      };

      if (editingUser) {
        await userService.update(editingUser.id, payload);
      } else {
        await userService.create(payload);
      }
      handleCloseModal();
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra từ máy chủ.');
    }
  };

  const handleDelete = async (user) => {
    if (user.email === currentUsername || user.username === currentUsername) {
      alert('Không thể xóa tài khoản của chính bạn đang đăng nhập!');
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${user.fullName}" (${user.email})?`)) {
      try {
        await userService.delete(user.id);
        fetchUsers();
      } catch (err) {
        alert(err.response?.data?.message || 'Không thể xóa tài khoản này!');
      }
    }
  };

  const totalActivityPages = Math.ceil(activities.length / ACTIVITIES_PER_PAGE);
  const activityStartIndex = (currentActivityPage - 1) * ACTIVITIES_PER_PAGE;
  const paginatedActivities = activities.slice(activityStartIndex, activityStartIndex + ACTIVITIES_PER_PAGE);

  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Shield size={64} className="text-red-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Truy cập bị từ chối</h2>
        <p className="text-gray-500">Chỉ có Quản trị viên (ADMIN) mới có quyền truy cập trang quản lý người dùng.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-lg shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Quản lý Người dùng & Phân Quyền</h1>
          <p className="text-gray-500 text-sm mt-1">Thiết lập tài khoản và quyền truy cập vào hệ thống kho</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary text-white px-4 py-2 rounded shadow hover:bg-primary-dark transition flex items-center gap-2"
        >
          <Plus size={20} />
          Tạo Tài khoản Mới
        </button>
      </div>

      <div className="bg-surface rounded-lg shadow-sm border border-gray-100">
        <div className="p-5 border-b flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Tìm theo tên, email, hoặc vai trò..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="text-left py-3 px-6 text-gray-600 font-medium">Họ tên</th>
                <th className="text-left py-3 px-6 text-gray-600 font-medium">Email / Tài khoản</th>
                <th className="text-center py-3 px-6 text-gray-600 font-medium">Vai trò (Role)</th>
                <th className="text-center py-3 px-6 text-gray-600 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="text-center py-10">
                    <Loader2 className="animate-spin text-primary mx-auto mb-2" size={32} />
                    <p className="text-gray-500">Đang tải danh sách người dùng...</p>
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const isCurrent = user.email === currentUsername || user.username === currentUsername;
                  return (
                    <tr key={user.id} className="border-t hover:bg-gray-50/50 transition">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="bg-gray-100 p-2 rounded-full text-gray-500">
                            <User size={18} />
                          </div>
                          <div>
                            <span className="font-medium text-gray-800">{user.fullName}</span>
                            {isCurrent && (
                              <span className="ml-2 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Bạn</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-gray-400" />
                          {user.email}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {user.role === 'ADMIN' ? (
                          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 font-semibold px-3 py-1 rounded-full text-sm">
                            <ShieldCheck size={14} /> Quản trị viên
                          </span>
                        ) : user.role === 'MANAGER' ? (
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 font-semibold px-3 py-1 rounded-full text-sm">
                            <Shield size={14} /> Quản lý kho
                          </span>
                        ) : (
                          <span className="inline-block bg-gray-100 text-gray-700 font-semibold px-3 py-1 rounded-full text-sm">
                            Nhân viên
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-4">
                          <button
                            onClick={() => handleOpenModal(user)}
                            className="text-blue-600 hover:text-blue-800 transition"
                            title="Sửa thông tin & Phân quyền"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className={`text-red-500 hover:text-red-700 transition disabled:opacity-30 disabled:cursor-not-allowed`}
                            title={isCurrent ? "Không thể xóa chính mình" : "Xóa tài khoản"}
                            disabled={isCurrent}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-gray-500">
                    Không tìm thấy người dùng nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Log Component */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 mt-8">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">Nhật ký hoạt động</h2>
          </div>
          <p className="text-gray-500 text-sm ml-8">Ghi chép theo thời gian các hoạt động trong hệ thống</p>
        </div>

        <div className="p-0">
          {paginatedActivities.length > 0 ? paginatedActivities.map((activity, index) => {
            const style = getActivityStyling(activity.status);
            const { time, date } = formatTime(activity.createdAt);
            return (
              <div key={activity.id} className={`p-5 flex gap-4 ${index !== paginatedActivities.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <div className="mt-0.5">
                  {style.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-gray-900">{activity.username}</span>
                    <span className="text-gray-600">{activity.action}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${style.color} border border-opacity-20`}>
                      {activity.status}
                    </span>
                  </div>
                  <p className="text-gray-800 mb-2">{activity.detail}</p>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    <Clock size={14} className="text-gray-400" />
                    <span>{time}</span>
                    <span className="mx-1">•</span>
                    <span>{date}</span>
                  </div>
                </div>
              </div>
            )
          }) : (
            <div className="p-10 text-center text-gray-500">Chưa có hoạt động nào được ghi nhận.</div>
          )}
        </div>

        {/* Pagination cho Activity Logs */}
        {activities.length > 0 && (
          <Pagination
            currentPage={currentActivityPage}
            totalPages={totalActivityPages}
            onPageChange={setCurrentActivityPage}
          />
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-gray-100">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-lg font-bold text-gray-800">
                {editingUser ? 'Chỉnh sửa Người dùng' : 'Tạo Tài khoản mới'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1 rounded transition">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5">
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-1.5">Tên đăng nhập <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => { setFormData({ ...formData, username: e.target.value }); setError(''); }}
                    className="w-full border rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition"
                    placeholder="VD: nguyenvana_123"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1.5">Họ và Tên <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => { setFormData({ ...formData, fullName: e.target.value }); setError(''); }}
                    className="w-full border rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition"
                    placeholder="VD: Nguyễn Văn A"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1.5">Địa chỉ Email <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.email}
                    onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setError(''); }}
                    className="w-full border rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition"
                    placeholder="VD: nv.a@warehouse.com"
                  />
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-gray-700 font-medium mb-1.5">Mật khẩu cấp phát <span className="text-red-500">*</span></label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => { setFormData({ ...formData, password: e.target.value }); setError(''); }}
                      className="w-full border rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition"
                      placeholder="Mật khẩu mật cho lần đầu đăng nhập"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-gray-700 font-medium mb-1.5">Vai trò (Phân quyền hệ thống) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full border rounded-lg pl-10 pr-4 py-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition appearance-none"
                    >
                      <option value="STAFF">Nhân viên (Quyền cơ bản, Nhập liệu)</option>
                      <option value="ADMIN">Quản trị viên (Toàn quyền, Cài đặt)</option>
                    </select>
                    <Shield className="absolute left-3.5 top-3 text-gray-400" size={18} />
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-5 text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-100 text-sm flex gap-2">
                  <span className="font-semibold">Lỗi:</span> {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 border rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark shadow-sm transition"
                >
                  {editingUser ? 'Lưu Thông Tin' : 'Tạo Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
