package com.example.backend.inventory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OverviewResponse {
    private long totalProducts;
    private long totalLowStock;
    private List<StockItemResponse> detailsLowStock;
    private long importsThisMonth;
    private long exportsThisMonth;
    private List<TopExportProductResponse> topExportProducts;
}
