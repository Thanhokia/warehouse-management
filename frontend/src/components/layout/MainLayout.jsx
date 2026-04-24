import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function MainLayout() {
  return (
      <div className="min-h-screen bg-bg flex">
      <Sidebar />
      <div className="flex-1 ml-64 p-4 lg:p-8">
        <Outlet />
      </div>
    </div>
  );
}
