package com.example.backend.inventory.dto.response;

import com.example.backend.inventory.entity.ExportOrder.OrderStatus;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class ExportOrderResponse {
    private Long id;
    private String orderCode;
    private Long warehouseId;
    private String warehouseName;
    private Long createdById;
    private String createdByName;
    private String recipientName;
    private String recipientDepartment;
    private String note;
    private OrderStatus status;
    private BigDecimal totalAmount;
    private LocalDateTime exportDate;
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

