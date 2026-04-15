package com.example.backend.inventory.service;

import com.example.backend.common.exception.ResourceNotFoundException;
import com.example.backend.inventory.dto.request.ImportOrderRequest;
import com.example.backend.inventory.dto.response.ImportOrderResponse;
import com.example.backend.inventory.entity.*;
import com.example.backend.inventory.repository.*;
import com.example.backend.inventory.entity.ImportOrder.OrderStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ImportOrderService {

    private final ImportOrderRepository importOrderRepository;
    private final WarehouseRepository warehouseRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final StockItemRepository stockItemRepository;

    public List<ImportOrderResponse> getAll() {
        return importOrderRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<ImportOrderResponse> getByWarehouse(Long warehouseId) {
        return importOrderRepository.findByWarehouseId(warehouseId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<ImportOrderResponse> getByStatus(OrderStatus status) {
        return importOrderRepository.findByStatus(status).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public ImportOrderResponse getById(Long id) {
        ImportOrder order = importOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Import order not found with id: " + id));
        return toResponse(order);
    }

    @Transactional
    public ImportOrderResponse create(Long createdByUserId, ImportOrderRequest request) {
        if (importOrderRepository.existsByOrderCode(request.getOrderCode())) {
            throw new IllegalArgumentException("Order code already exists: " + request.getOrderCode());
        }

        Warehouse warehouse = warehouseRepository.findById(request.getWarehouseId())
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + request.getWarehouseId()));

        User createdBy = userRepository.findById(createdByUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + createdByUserId));

        ImportOrder order = ImportOrder.builder()
                .orderCode(request.getOrderCode())
                .warehouse(warehouse)
                .createdBy(createdBy)
                .supplierName(request.getSupplierName())
                .note(request.getNote())
                .status(OrderStatus.PENDING)
                .totalAmount(BigDecimal.ZERO)
                .importDate(LocalDateTime.now())
                .build();

        BigDecimal total = BigDecimal.ZERO;
        for (ImportOrderRequest.DetailRequest detailReq : request.getDetails()) {
            Product product = productRepository.findById(detailReq.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + detailReq.getProductId()));

            BigDecimal unitPrice = detailReq.getUnitPrice() != null ? detailReq.getUnitPrice() : BigDecimal.ZERO;
            BigDecimal totalPrice = detailReq.getQuantity().multiply(unitPrice);

            ImportOrderDetail detail = ImportOrderDetail.builder()
                    .importOrder(order)
                    .product(product)
                    .quantity(detailReq.getQuantity())
                    .unitPrice(unitPrice)
                    .totalPrice(totalPrice)
                    .note(detailReq.getNote())
                    .build();
            order.getDetails().add(detail);
            total = total.add(totalPrice);
        }
        order.setTotalAmount(total);

        return toResponse(importOrderRepository.save(order));
    }

    @Transactional
    public ImportOrderResponse updateStatus(Long id, OrderStatus newStatus) {
        ImportOrder order = importOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Import order not found with id: " + id));

        OrderStatus currentStatus = order.getStatus();

        // Nếu chuyển sang COMPLETED -> cộng tồn kho
        if (newStatus == OrderStatus.COMPLETED && currentStatus != OrderStatus.COMPLETED) {
            updateStockOnComplete(order);
            order.setImportDate(LocalDateTime.now());
        }

        // Nếu đảo từ COMPLETED sang trạng thái khác -> trừ lại tồn kho
        if (currentStatus == OrderStatus.COMPLETED && newStatus != OrderStatus.COMPLETED) {
            reverseStockOnUnComplete(order);
            order.setImportDate(null);
        }

        order.setStatus(newStatus);
        return toResponse(importOrderRepository.save(order));
    }

    @Transactional
    public void delete(Long id) {
        ImportOrder order = importOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Import order not found with id: " + id));
        if (order.getStatus() == OrderStatus.COMPLETED) {
            throw new IllegalStateException("Cannot delete a completed import order");
        }
        importOrderRepository.delete(order);
    }

    private void updateStockOnComplete(ImportOrder order) {
        for (ImportOrderDetail detail : order.getDetails()) {
            StockItem stockItem = stockItemRepository
                    .findByWarehouseIdAndProductId(order.getWarehouse().getId(), detail.getProduct().getId())
                    .orElseGet(() -> StockItem.builder()
                            .warehouse(order.getWarehouse())
                            .product(detail.getProduct())
                            .quantity(BigDecimal.ZERO)
                            .build());
            stockItem.setQuantity(stockItem.getQuantity().add(detail.getQuantity()));
            stockItemRepository.save(stockItem);
        }
    }

    private void reverseStockOnUnComplete(ImportOrder order) {
        for (ImportOrderDetail detail : order.getDetails()) {
            stockItemRepository
                    .findByWarehouseIdAndProductId(order.getWarehouse().getId(), detail.getProduct().getId())
                    .ifPresent(stockItem -> {
                        stockItem.setQuantity(stockItem.getQuantity().subtract(detail.getQuantity()));
                        stockItemRepository.save(stockItem);
                    });
        }
    }

    private ImportOrderResponse toResponse(ImportOrder order) {
        List<ImportOrderResponse.DetailResponse> details = order.getDetails().stream()
                .map(d -> ImportOrderResponse.DetailResponse.builder()
                        .id(d.getId())
                        .productId(d.getProduct().getId())
                        .productCode(d.getProduct().getCode())
                        .productName(d.getProduct().getName())
                        .productUnit(d.getProduct().getUnit())
                        .quantity(d.getQuantity())
                        .unitPrice(d.getUnitPrice())
                        .totalPrice(d.getTotalPrice())
                        .note(d.getNote())
                        .build())
                .collect(Collectors.toList());

        return ImportOrderResponse.builder()
                .id(order.getId())
                .orderCode(order.getOrderCode())
                .warehouseId(order.getWarehouse().getId())
                .warehouseName(order.getWarehouse().getName())
                .createdById(order.getCreatedBy().getId())
                .createdByName(order.getCreatedBy().getFullName())
                .supplierName(order.getSupplierName())
                .note(order.getNote())
                .status(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .importDate(order.getImportDate())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .details(details)
                .build();
    }
}


