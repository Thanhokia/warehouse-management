package com.example.backend.inventory.service;

import com.example.backend.common.exception.ResourceNotFoundException;
import com.example.backend.inventory.dto.request.WarehouseRequest;
import com.example.backend.inventory.dto.response.StockItemResponse;
import com.example.backend.inventory.dto.response.WarehouseResponse;
import com.example.backend.inventory.entity.Warehouse;
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
public class WarehouseService {

    private final WarehouseRepository warehouseRepository;
    private final StockItemRepository stockItemRepository;
    private final ActivityLogService activityLogService;

    public List<WarehouseResponse> getAll() {
        return warehouseRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<WarehouseResponse> getAllActive() {
        return warehouseRepository.findAll().stream()
                .filter(w -> Boolean.TRUE.equals(w.getIsActive()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public WarehouseResponse getById(Long id) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + id));
        return toResponse(warehouse);
    }

    public List<StockItemResponse> getStock(Long warehouseId) {
        warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + warehouseId));
        return stockItemRepository.findByWarehouseId(warehouseId).stream()
                .map(item -> StockItemResponse.builder()
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
                        .build())
                .collect(Collectors.toList());
    }

    public List<StockItemResponse> getLowStockAlerts(Long warehouseId) {
        warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + warehouseId));
        return stockItemRepository.findBelowMinLevelByWarehouse(warehouseId).stream()
                .map(item -> StockItemResponse.builder()
                        .id(item.getId())
                        .warehouseId(item.getWarehouse().getId())
                        .warehouseName(item.getWarehouse().getName())
                        .productId(item.getProduct().getId())
                        .productCode(item.getProduct().getCode())
                        .productName(item.getProduct().getName())
                        .productUnit(item.getProduct().getUnit())
                        .quantity(item.getQuantity())
                        .minStockLevel(item.getProduct().getMinStockLevel())
                        .belowMinLevel(true)
                        .lastUpdated(item.getLastUpdated())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public WarehouseResponse create(WarehouseRequest request) {
        if (warehouseRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Warehouse code already exists: " + request.getCode());
        }
        Warehouse warehouse = Warehouse.builder()
                .code(request.getCode())
                .name(request.getName())
                .address(request.getAddress())
                .description(request.getDescription())
                .isActive(true)
                .build();
        Warehouse saved = warehouseRepository.save(warehouse);
        activityLogService.logAction("đã tạo", "Thành công", "kho hàng mới: " + saved.getName());
        return toResponse(saved);
    }

    @Transactional
    public WarehouseResponse update(Long id, WarehouseRequest request) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + id));

        if (!warehouse.getCode().equals(request.getCode())
                && warehouseRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Warehouse code already exists: " + request.getCode());
        }

        warehouse.setCode(request.getCode());
        warehouse.setName(request.getName());
        warehouse.setAddress(request.getAddress());
        warehouse.setDescription(request.getDescription());
        if (request.getIsActive() != null) {
            warehouse.setIsActive(request.getIsActive());
        }
        Warehouse updated = warehouseRepository.save(warehouse);
        activityLogService.logAction("đã cập nhật", "Thông tin", "thông tin kho hàng: " + updated.getName());
        return toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + id));
        warehouse.setIsActive(false);
        warehouseRepository.save(warehouse);
        activityLogService.logAction("đã xóa", "Cảnh báo", "kho hàng: " + warehouse.getName());
    }

    private WarehouseResponse toResponse(Warehouse warehouse) {
        return WarehouseResponse.builder()
                .id(warehouse.getId())
                .code(warehouse.getCode())
                .name(warehouse.getName())
                .address(warehouse.getAddress())
                .description(warehouse.getDescription())
                .isActive(warehouse.getIsActive())
                .createdAt(warehouse.getCreatedAt())
                .updatedAt(warehouse.getUpdatedAt())
                .build();
    }
}


