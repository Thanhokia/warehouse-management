package com.example.backend.inventory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopExportProductResponse {
    private Long productId;
    private String productCode;
    private String productName;
    private String productUnit;
    private BigDecimal totalQuantity;
}
