package com.example.backend.inventory.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class ProductRequest {

    @NotBlank(message = "Code is required")
    private String code;

    @NotBlank(message = "Name is required")
    private String name;

    private String description;

    @NotBlank(message = "Unit is required")
    private String unit;

    @Positive(message = "Min stock level must be positive")
    private BigDecimal minStockLevel = BigDecimal.ZERO;

    @Positive(message = "Price must be positive")
    private BigDecimal price = BigDecimal.ZERO;

    @NotNull(message = "Category is required")
    private Long categoryId;

    private Boolean isActive = true;
}
