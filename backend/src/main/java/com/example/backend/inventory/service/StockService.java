package com.example.backend.inventory.service;

import com.example.backend.common.exception.ResourceNotFoundException;
import com.example.backend.inventory.dto.response.StockItemResponse;
import com.example.backend.inventory.entity.StockItem;
import com.example.backend.inventory.repository.StockItemRepository;
import com.example.backend.inventory.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;
import java.math.BigDecimal;
import com.example.backend.inventory.dto.request.StockAdjustRequest;
import com.example.backend.inventory.entity.ActivityLog;
import com.example.backend.inventory.entity.InventoryCheckDetail;
import com.example.backend.inventory.entity.Warehouse;
import com.example.backend.inventory.repository.ActivityLogRepository;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StockService {

    private final StockItemRepository stockItemRepository;
    private final WarehouseRepository warehouseRepository;
    private final ActivityLogRepository activityLogRepository;

    // Xem tồn kho toàn hệ thống
    public List<StockItemResponse> getAll() {
        return stockItemRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // Xem tồn kho theo kho
    public List<StockItemResponse> getByWarehouse(Long warehouseId) {
        if (!warehouseRepository.existsById(warehouseId)) {
            throw new ResourceNotFoundException("Warehouse not found with id: " + warehouseId);
        }
        return stockItemRepository.findByWarehouseId(warehouseId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // Xem tồn kho theo sản phẩm (tất cả các kho có sản phẩm này)
    public List<StockItemResponse> getByProduct(Long productId) {
        return stockItemRepository.findByProductId(productId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // Xem tồn kho của 1 sản phẩm tại 1 kho cụ thể
    public StockItemResponse getByWarehouseAndProduct(Long warehouseId, Long productId) {
        StockItem item = stockItemRepository
                .findByWarehouseIdAndProductId(warehouseId, productId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Stock not found for warehouseId=" + warehouseId + " productId=" + productId));
        return toResponse(item);
    }

    // Cảnh báo hàng dưới ngưỡng tối thiểu (toàn hệ thống)
    public List<StockItemResponse> getLowStock() {
        return stockItemRepository.findAllBelowMinLevel().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // Cảnh báo hàng dưới ngưỡng tối thiểu (theo kho)
    public List<StockItemResponse> getLowStockByWarehouse(Long warehouseId) {
        if (!warehouseRepository.existsById(warehouseId)) {
            throw new ResourceNotFoundException("Warehouse not found with id: " + warehouseId);
        }
        return stockItemRepository.findBelowMinLevelByWarehouse(warehouseId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void adjustStockBatch(List<StockAdjustRequest> requests, String username) {
        for (StockAdjustRequest request : requests) {
            StockItem item = stockItemRepository
                    .findByWarehouseIdAndProductId(request.getWarehouseId(), request.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Stock not found for warehouseId=" + request.getWarehouseId() + " productId=" + request.getProductId()));

            BigDecimal oldQuantity = item.getQuantity();
            BigDecimal newQuantity = request.getActualQuantity();
            BigDecimal difference = newQuantity.subtract(oldQuantity);

            if (difference.compareTo(BigDecimal.ZERO) != 0) {
                item.setQuantity(newQuantity);
                stockItemRepository.save(item);

                ActivityLog log = ActivityLog.builder()
                        .username(username)
                        .action("đã kiểm kê")
                        .status("Thành công")
                        .detail(String.format("Điều chỉnh tồn kho sản phẩm [%s] tại kho [%s]. Số lượng: %s -> %s (Chênh lệch: %s). Lý do: %s",
                                item.getProduct().getCode(),
                                item.getWarehouse().getName(),
                                oldQuantity.toString(),
                                newQuantity.toString(),
                                difference.toString(),
                                request.getReason()))
                        .build();
                activityLogRepository.save(log);
            }
        }
    }

    @Transactional
    public void applyInventoryCheckDifferences(List<InventoryCheckDetail> details, Long warehouseId, String username) {
        for (InventoryCheckDetail detail : details) {
            BigDecimal difference = detail.getDifference();
            if (difference != null && difference.compareTo(BigDecimal.ZERO) != 0) {
                StockItem item = stockItemRepository
                        .findByWarehouseIdAndProductId(warehouseId, detail.getProduct().getId())
                        .orElseGet(() -> {
                            Warehouse warehouse = warehouseRepository.findById(warehouseId)
                                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + warehouseId));
                            return StockItem.builder()
                                    .warehouse(warehouse)
                                    .product(detail.getProduct())
                                    .quantity(BigDecimal.ZERO)
                                    .build();
                        });

                BigDecimal oldQuantity = item.getQuantity() != null ? item.getQuantity() : BigDecimal.ZERO;
                BigDecimal newQuantity = oldQuantity.add(difference);
                
                // Prevent negative stock
                if (newQuantity.compareTo(BigDecimal.ZERO) < 0) {
                    newQuantity = BigDecimal.ZERO;
                    difference = newQuantity.subtract(oldQuantity);
                }

                item.setQuantity(newQuantity);
                stockItemRepository.save(item);

                ActivityLog log = ActivityLog.builder()
                        .username(username)
                        .action("đã duyệt kiểm kê")
                        .status("Thành công")
                        .detail(String.format("Điều chỉnh tồn kho sản phẩm [%s] tại kho [%s]. Số lượng: %s -> %s (Chênh lệch: %s). Lý do: %s",
                                detail.getProduct().getCode(),
                                item.getWarehouse().getName(),
                                oldQuantity.toString(),
                                newQuantity.toString(),
                                difference.toString(),
                                detail.getReason()))
                        .build();
                activityLogRepository.save(log);
            }
        }
    }

    private StockItemResponse toResponse(StockItem item) {
        return StockItemResponse.builder()
                .id(item.getId())
                .warehouseId(item.getWarehouse().getId())
                .warehouseName(item.getWarehouse().getName())
                .productId(item.getProduct().getId())
                .productCode(item.getProduct().getCode())
                .productName(item.getProduct().getName())
                .productUnit(item.getProduct().getUnit())
                .quantity(item.getQuantity())
                .minStockLevel(item.getProduct().getMinStockLevel())
                .belowMinLevel(item.isBelowMinLevel())
                .lastUpdated(item.getLastUpdated())
                .build();
    }
}