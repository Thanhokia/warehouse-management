package com.example.backend.inventory.dto.request;

import jakarta.validation.constraints.Min;
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
public class StockAdjustRequest {
    @NotNull(message = "Product ID is required")
    private Long productId;

    @NotNull(message = "Warehouse ID is required")
    private Long warehouseId;

    @NotNull(message = "Actual quantity is required")
    @Min(value = 0, message = "Quantity cannot be negative")
    private BigDecimal actualQuantity;

    private String reason;
}
