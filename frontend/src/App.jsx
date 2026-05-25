import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import Products from './pages/Products';
import Warehouses from './pages/Warehouses';
import Transactions from './pages/Transactions';
import GoodsReceipt from './pages/GoodsReceipt';
import GoodsIssue from './pages/GoodsIssue';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Login from './pages/Login';

import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Route không kèm giao diện Sidebar (Login) */}
        <Route path="/login" element={<Login />} />
        
        {/* Các Route có Sidebar chung, yêu cầu Đăng nhập */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="categories" element={<Categories />} />
          <Route path="products" element={<Products />} />
          <Route path="warehouses" element={<Warehouses />} />
          <Route path="transactions" element={<Transactions />} />
          {/* Đổi url thành import và export theo yêu cầu */}
          <Route path="import" element={<GoodsReceipt />} />
          <Route path="export" element={<GoodsIssue />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="reports" element={<Reports />} />
          <Route path="users" element={<Users />} />
        </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
