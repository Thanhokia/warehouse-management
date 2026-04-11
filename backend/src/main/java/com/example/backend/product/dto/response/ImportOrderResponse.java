package com.example.backend.product.dto.response;

import com.example.backend.product.entity.ImportOrder.OrderStatus;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class ImportOrderResponse {
    private Long id;
    private String orderCode;
    private Long warehouseId;
    private String warehouseName;
    private Long createdById;
    private String createdByName;
    private String supplierName;
    private String note;
    private OrderStatus status;
    private BigDecimal totalAmount;
    private LocalDateTime importDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<DetailResponse> details;

    @Getter
    @Builder
    public static class DetailResponse {
        private Long id;
        private Long productId;
        private String productCode;
        private String productName;
        private String productUnit;
        private BigDecimal quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;
        private String note;
    }
}