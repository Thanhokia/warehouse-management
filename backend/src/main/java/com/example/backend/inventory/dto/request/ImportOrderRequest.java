package com.example.backend.inventory.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
public class ImportOrderRequest {

    @NotBlank(message = "Order code is required")
    private String orderCode;

    @NotNull(message = "Warehouse is required")
    private Long warehouseId;

    private String supplierName;
    private String note;

    @NotEmpty(message = "Order must have at least one detail")
    private List<DetailRequest> details;

    @Getter
    @Setter
    public static class DetailRequest {

        @NotNull(message = "Product is required")
        private Long productId;

        @NotNull(message = "Quantity is required")
        @Positive(message = "Quantity must be positive")
        private BigDecimal quantity;

        @Positive(message = "Unit price must be positive")
        private BigDecimal unitPrice = BigDecimal.ZERO;

        private String note;
    }
}

