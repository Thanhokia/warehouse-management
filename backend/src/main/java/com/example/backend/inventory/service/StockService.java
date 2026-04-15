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

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StockService {

    private final StockItemRepository stockItemRepository;
    private final WarehouseRepository warehouseRepository;

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