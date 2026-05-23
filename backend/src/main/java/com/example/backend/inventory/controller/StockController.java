package com.example.backend.inventory.controller;

import com.example.backend.common.response.ApiResponse;
import com.example.backend.inventory.dto.response.StockItemResponse;
import com.example.backend.inventory.service.StockService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import com.example.backend.inventory.dto.request.StockAdjustRequest;

@Tag(name = "Stock")
@RestController
@RequestMapping("/api/stock")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
public class StockController {

    private final StockService stockService;

    // GET /api/stock                          → toàn bộ tồn kho
    // GET /api/stock?warehouseId=1            → tồn kho theo kho
    // GET /api/stock?productId=5              → tồn kho của 1 sản phẩm tại tất cả kho
    // GET /api/stock?warehouseId=1&productId=5 → tồn kho 1 sản phẩm tại 1 kho
    @GetMapping
    public ResponseEntity<ApiResponse<List<StockItemResponse>>> getStock(
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) Long productId) {

        List<StockItemResponse> result;

        if (warehouseId != null && productId != null) {
            result = List.of(stockService.getByWarehouseAndProduct(warehouseId, productId));
        } else if (warehouseId != null) {
            result = stockService.getByWarehouse(warehouseId);
        } else if (productId != null) {
            result = stockService.getByProduct(productId);
        } else {
            result = stockService.getAll();
        }

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    // GET /api/stock/low-stock                → cảnh báo dưới ngưỡng (toàn hệ thống)
    // GET /api/stock/low-stock?warehouseId=1  → cảnh báo dưới ngưỡng theo kho
    @GetMapping("/low-stock")
    public ResponseEntity<ApiResponse<List<StockItemResponse>>> getLowStock(
            @RequestParam(required = false) Long warehouseId) {

        List<StockItemResponse> result = warehouseId != null
                ? stockService.getLowStockByWarehouse(warehouseId)
                : stockService.getLowStock();

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/adjust-batch")
    public ResponseEntity<ApiResponse<String>> adjustStockBatch(
            @Valid @RequestBody List<StockAdjustRequest> requests,
            Authentication authentication) {
        
        stockService.adjustStockBatch(requests, authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok("Stock adjusted successfully"));
    }
}