package com.example.backend.product.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
public class StockItemResponse {
    private Long id;
    private Long warehouseId;
    private String warehouseName;
    private Long productId;
    private String productCode;
    private String productName;
    private String productUnit;
    private BigDecimal quantity;
    private BigDecimal minStockLevel;
    private boolean belowMinLevel;
    private LocalDateTime lastUpdated;
}