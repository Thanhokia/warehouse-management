package com.example.backend.inventory.service;

import com.example.backend.common.exception.ResourceNotFoundException;
import com.example.backend.inventory.dto.request.ExportOrderRequest;
import com.example.backend.inventory.dto.response.ExportOrderResponse;
import com.example.backend.inventory.entity.*;
import com.example.backend.inventory.repository.*;
import com.example.backend.inventory.entity.ExportOrder.OrderStatus;
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
public class ExportOrderService {

    private final ExportOrderRepository exportOrderRepository;
    private final WarehouseRepository warehouseRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final StockItemRepository stockItemRepository;
    private final ActivityLogService activityLogService;

    public List<ExportOrderResponse> getAll() {
        return exportOrderRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<ExportOrderResponse> getByWarehouse(Long warehouseId) {
        return exportOrderRepository.findByWarehouseId(warehouseId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<ExportOrderResponse> getByStatus(OrderStatus status) {
        return exportOrderRepository.findByStatus(status).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public ExportOrderResponse getById(Long id) {
        ExportOrder order = exportOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Export order not found with id: " + id));
        return toResponse(order);
    }

    @Transactional
    public ExportOrderResponse create(Long createdByUserId, ExportOrderRequest request) {
        if (exportOrderRepository.existsByOrderCode(request.getOrderCode())) {
            throw new IllegalArgumentException("Order code already exists: " + request.getOrderCode());
        }

        Warehouse warehouse = warehouseRepository.findById(request.getWarehouseId())
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + request.getWarehouseId()));

        User createdBy = userRepository.findById(createdByUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + createdByUserId));

        ExportOrder order = ExportOrder.builder()
                .orderCode(request.getOrderCode())
                .warehouse(warehouse)
                .createdBy(createdBy)
                .recipientName(request.getRecipientName())
                .recipientDepartment(request.getRecipientDepartment())
                .note(request.getNote())
                .status(OrderStatus.PENDING)
                .totalAmount(BigDecimal.ZERO)
                .exportDate(LocalDateTime.now())
                .build();

        BigDecimal total = BigDecimal.ZERO;
        for (ExportOrderRequest.DetailRequest detailReq : request.getDetails()) {
            Product product = productRepository.findById(detailReq.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + detailReq.getProductId()));

            BigDecimal unitPrice = detailReq.getUnitPrice() != null ? detailReq.getUnitPrice() : BigDecimal.ZERO;
            BigDecimal totalPrice = detailReq.getQuantity().multiply(unitPrice);

            ExportOrderDetail detail = ExportOrderDetail.builder()
                    .exportOrder(order)
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

        order = exportOrderRepository.save(order);
        activityLogService.logAction("đã tạo", "Thông tin", "phiếu xuất kho: " + order.getOrderCode());
        return toResponse(order);
    }

    @Transactional
    public ExportOrderResponse updateStatus(Long id, OrderStatus newStatus) {
        ExportOrder order = exportOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Export order not found with id: " + id));

        OrderStatus currentStatus = order.getStatus();

        // Nếu chuyển sang COMPLETED -> trừ tồn kho
        if (newStatus == OrderStatus.COMPLETED && currentStatus != OrderStatus.COMPLETED) {
            deductStockOnComplete(order);
            order.setExportDate(LocalDateTime.now());
            BigDecimal totalQty = order.getDetails().stream().map(ExportOrderDetail::getQuantity).reduce(BigDecimal.ZERO, BigDecimal::add);
            activityLogService.logAction("đã xuất", "Thành công", totalQty + " sản phẩm từ kho " + order.getWarehouse().getName());
        }

        // Nếu đảo từ COMPLETED sang trạng thái khác -> cộng lại tồn kho
        if (currentStatus == OrderStatus.COMPLETED && newStatus != OrderStatus.COMPLETED) {
            reverseStockOnUnComplete(order);
            order.setExportDate(null);
        }

        order.setStatus(newStatus);
        return toResponse(exportOrderRepository.save(order));
    }

    @Transactional
    public void delete(Long id) {
        ExportOrder order = exportOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Export order not found with id: " + id));
        if (order.getStatus() == OrderStatus.COMPLETED) {
            throw new IllegalStateException("Cannot delete a completed export order");
        }
        exportOrderRepository.delete(order);
    }

    private void deductStockOnComplete(ExportOrder order) {
        for (ExportOrderDetail detail : order.getDetails()) {
            StockItem stockItem = stockItemRepository
                    .findByWarehouseIdAndProductId(order.getWarehouse().getId(), detail.getProduct().getId())
                    .orElseThrow(() -> new IllegalStateException(
                            "Product " + detail.getProduct().getCode() + " is not in stock at warehouse " + order.getWarehouse().getName()));

            if (stockItem.getQuantity().compareTo(detail.getQuantity()) < 0) {
                throw new IllegalStateException(
                        "Insufficient stock for product " + detail.getProduct().getCode()
                                + ". Available: " + stockItem.getQuantity()
                                + ", Requested: " + detail.getQuantity());
            }
            stockItem.setQuantity(stockItem.getQuantity().subtract(detail.getQuantity()));
            stockItemRepository.save(stockItem);
        }
    }

    private void reverseStockOnUnComplete(ExportOrder order) {
        for (ExportOrderDetail detail : order.getDetails()) {
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

    private ExportOrderResponse toResponse(ExportOrder order) {
        List<ExportOrderResponse.DetailResponse> details = order.getDetails().stream()
                .map(d -> ExportOrderResponse.DetailResponse.builder()
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

        return ExportOrderResponse.builder()
                .id(order.getId())
                .orderCode(order.getOrderCode())
                .warehouseId(order.getWarehouse().getId())
                .warehouseName(order.getWarehouse().getName())
                .createdById(order.getCreatedBy().getId())
                .createdByName(order.getCreatedBy().getFullName())
                .recipientName(order.getRecipientName())
                .recipientDepartment(order.getRecipientDepartment())
                .note(order.getNote())
                .status(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .exportDate(order.getExportDate())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .details(details)
                .build();
    }
}


