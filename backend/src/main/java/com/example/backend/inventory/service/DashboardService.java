package com.example.backend.inventory.service;

import com.example.backend.inventory.dto.response.InventoryTrendResponse;
import com.example.backend.inventory.dto.response.OverviewResponse;
import com.example.backend.inventory.dto.response.StockItemResponse;
import com.example.backend.inventory.dto.response.TopExportProductResponse;
import com.example.backend.inventory.entity.ExportOrder;
import com.example.backend.inventory.entity.ExportOrderDetail;
import com.example.backend.inventory.entity.ImportOrder;
import com.example.backend.inventory.entity.ImportOrderDetail;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final EntityManager entityManager;
    private final StockService stockService;

    @Transactional(readOnly = true)
    public OverviewResponse getOverview() {
        long totalProducts = entityManager.createQuery("SELECT COUNT(p) FROM Product p", Long.class)
                .getSingleResult();

        List<StockItemResponse> lowStock = stockService.getLowStock();
        long totalLowStock = lowStock.size();
        List<StockItemResponse> detailsLowStock = lowStock.stream()
                .filter(item -> item.getQuantity().compareTo(item.getMinStockLevel()) <= 0)
                .limit(5)
                .collect(java.util.stream.Collectors.toList());

        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);

        long importsThisMonth = entityManager.createQuery(
                "SELECT COUNT(o) FROM ImportOrder o WHERE o.status = :status AND COALESCE(o.importDate, o.createdAt) >= :date", Long.class)
                .setParameter("status", ImportOrder.OrderStatus.COMPLETED)
                .setParameter("date", thirtyDaysAgo)
                .getSingleResult();

        long exportsThisMonth = entityManager.createQuery(
                "SELECT COUNT(o) FROM ExportOrder o WHERE o.status = :status AND COALESCE(o.exportDate, o.createdAt) >= :date", Long.class)
                .setParameter("status", ExportOrder.OrderStatus.COMPLETED)
                .setParameter("date", thirtyDaysAgo)
                .getSingleResult();

        List<Object[]> topProductsData = entityManager.createQuery(
                "SELECT d.product.id, d.product.code, d.product.name, d.product.unit, SUM(d.quantity) as totalQty " +
                "FROM ExportOrderDetail d JOIN d.exportOrder o " +
                "WHERE o.status = :status AND COALESCE(o.exportDate, o.createdAt) >= :date " +
                "GROUP BY d.product.id, d.product.code, d.product.name, d.product.unit " +
                "ORDER BY totalQty DESC", Object[].class)
                .setParameter("status", ExportOrder.OrderStatus.COMPLETED)
                .setParameter("date", thirtyDaysAgo)
                .setMaxResults(5)
                .getResultList();

        List<TopExportProductResponse> topExportProducts = new ArrayList<>();
        for (Object[] row : topProductsData) {
            topExportProducts.add(TopExportProductResponse.builder()
                    .productId((Long) row[0])
                    .productCode((String) row[1])
                    .productName((String) row[2])
                    .productUnit((String) row[3])
                    .totalQuantity((BigDecimal) row[4])
                    .build());
        }

        return OverviewResponse.builder()
                .totalProducts(totalProducts)
                .totalLowStock(totalLowStock)
                .detailsLowStock(detailsLowStock)
                .importsThisMonth(importsThisMonth)
                .exportsThisMonth(exportsThisMonth)
                .topExportProducts(topExportProducts)
                .build();
    }

    @Transactional(readOnly = true)
    public List<InventoryTrendResponse> getInventoryTrend() {
        // 1. Lấy tổng tồn kho hiện tại
        BigDecimal currentTotalStock = entityManager.createQuery("SELECT SUM(s.quantity) FROM StockItem s", BigDecimal.class)
                .getSingleResult();
        if (currentTotalStock == null) {
            currentTotalStock = BigDecimal.ZERO;
        }

        // 2. Lấy dữ liệu nhập/xuất trong 6 tháng qua
        LocalDate sixMonthsAgo = LocalDate.now().minusMonths(5).withDayOfMonth(1);
        LocalDateTime startDate = sixMonthsAgo.atStartOfDay();

        List<ImportOrderDetail> imports = entityManager.createQuery(
                "SELECT d FROM ImportOrderDetail d JOIN FETCH d.importOrder o " +
                "WHERE o.status = :status AND COALESCE(o.importDate, o.createdAt) >= :date", ImportOrderDetail.class)
                .setParameter("status", ImportOrder.OrderStatus.COMPLETED)
                .setParameter("date", startDate)
                .getResultList();

        List<ExportOrderDetail> exports = entityManager.createQuery(
                "SELECT d FROM ExportOrderDetail d JOIN FETCH d.exportOrder o " +
                "WHERE o.status = :status AND COALESCE(o.exportDate, o.createdAt) >= :date", ExportOrderDetail.class)
                .setParameter("status", ExportOrder.OrderStatus.COMPLETED)
                .setParameter("date", startDate)
                .getResultList();

        // 3. Tính toán lùi cho 6 tháng
        List<InventoryTrendResponse> result = new ArrayList<>();
        YearMonth currentMonth = YearMonth.now();
        BigDecimal runningStock = currentTotalStock;

        for (int i = 0; i < 6; i++) {
            YearMonth targetMonth = currentMonth.minusMonths(i);
            
            // Tính tổng nhập/xuất của tháng targetMonth
            BigDecimal monthImports = BigDecimal.ZERO;
            for (ImportOrderDetail d : imports) {
                LocalDateTime date = d.getImportOrder().getImportDate() != null 
                        ? d.getImportOrder().getImportDate() 
                        : d.getImportOrder().getCreatedAt();
                if (YearMonth.from(date).equals(targetMonth)) {
                    monthImports = monthImports.add(d.getQuantity());
                }
            }

            BigDecimal monthExports = BigDecimal.ZERO;
            for (ExportOrderDetail d : exports) {
                LocalDateTime date = d.getExportOrder().getExportDate() != null 
                        ? d.getExportOrder().getExportDate() 
                        : d.getExportOrder().getCreatedAt();
                if (YearMonth.from(date).equals(targetMonth)) {
                    monthExports = monthExports.add(d.getQuantity());
                }
            }

            result.add(new InventoryTrendResponse(
                    "Tháng " + targetMonth.getMonthValue(),
                    runningStock,
                    monthImports,
                    monthExports
            ));
            // Tồn kho tháng trước = Tồn kho tháng này - Nhập tháng này + Xuất tháng này
            runningStock = runningStock.subtract(monthImports).add(monthExports);
        }

        Collections.reverse(result);
        return result;
    }
}
