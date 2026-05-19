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
public class InventoryTrendResponse {
    private String name;
    private BigDecimal stock;
    private BigDecimal imports;
    private BigDecimal exports;
}
