package com.example.backend.inventory.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryCheckDetailRequest {
    
    @NotNull(message = "Product ID is required")
    private Long productId;

    @NotNull(message = "Original quantity is required")
    private BigDecimal originalQuantity;

    @NotNull(message = "Actual quantity is required")
    private BigDecimal actualQuantity;

    private String reason;
}
