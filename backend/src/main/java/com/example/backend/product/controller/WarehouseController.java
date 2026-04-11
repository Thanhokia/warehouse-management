package com.example.backend.product.controller;

import com.example.backend.common.response.ApiResponse;
import com.example.backend.product.dto.request.WarehouseRequest;
import com.example.backend.product.dto.response.StockItemResponse;
import com.example.backend.product.dto.response.WarehouseResponse;
import com.example.backend.product.service.WarehouseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/warehouses")
@RequiredArgsConstructor
public class WarehouseController {

    private final WarehouseService warehouseService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<WarehouseResponse>>> getAll(
            @RequestParam(required = false) Boolean activeOnly) {
        List<WarehouseResponse> result = Boolean.TRUE.equals(activeOnly)
                ? warehouseService.getAllActive()
                : warehouseService.getAll();
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<WarehouseResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(warehouseService.getById(id)));
    }

    @GetMapping("/{id}/stock")
    public ResponseEntity<ApiResponse<List<StockItemResponse>>> getStock(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(warehouseService.getStock(id)));
    }

    @GetMapping("/{id}/stock/low-alerts")
    public ResponseEntity<ApiResponse<List<StockItemResponse>>> getLowStockAlerts(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(warehouseService.getLowStockAlerts(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WarehouseResponse>> create(
            @Valid @RequestBody WarehouseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Warehouse created successfully", warehouseService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<WarehouseResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody WarehouseRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Warehouse updated successfully", warehouseService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        warehouseService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Warehouse deactivated successfully", null));
    }
}