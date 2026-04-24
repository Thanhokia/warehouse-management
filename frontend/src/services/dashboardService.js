import productService from './productService';
import reportService from './reportService';
import transactionService from './transactionService';

const dashboardService = {
  getOverview: async () => {
    try {
      const [productsRes, lowStockRes, importsRes, exportsRes] = await Promise.all([
        productService.getAll(),
        reportService.getLowStock(),
        transactionService.getAllImports(),
        transactionService.getAllExports()
      ]);

      const products = productsRes?.data || (Array.isArray(productsRes) ? productsRes : []);
      const lowStock = lowStockRes?.data || (Array.isArray(lowStockRes) ? lowStockRes : []);
      const imports = importsRes?.data || (Array.isArray(importsRes) ? importsRes : []);
      const exports = exportsRes?.data || (Array.isArray(exportsRes) ? exportsRes : []);

      // Lọc các phiếu nhập/xuất trong tháng hiện tại
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const importsThisMonth = imports.filter(i => {
        if (i.status !== 'COMPLETED') return false;
        const d = new Date(i.importDate || i.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).length;

      const exportsThisMonth = exports.filter(e => {
        if (e.status !== 'COMPLETED') return false;
        const d = new Date(e.exportDate || e.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).length;

      return {
        totalProducts: products.length,
        totalLowStock: lowStock.length,
        detailsLowStock: lowStock.slice(0, 5), // Lấy 5 mặt hàng cảnh báo để hiển thị
        importsThisMonth,
        exportsThisMonth,
      };
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu tổng quan:", error);
      throw error;
    }
  }
};

export default dashboardService;
