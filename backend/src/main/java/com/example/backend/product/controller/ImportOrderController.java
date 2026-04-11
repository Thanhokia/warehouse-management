package com.example.backend.product.controller;

import com.example.backend.common.response.ApiResponse;
import com.example.backend.product.dto.request.ImportOrderRequest;
import com.example.backend.product.dto.response.ImportOrderResponse;
import com.example.backend.product.entity.ImportOrder.OrderStatus;
import com.example.backend.product.service.ImportOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/import-orders")
@RequiredArgsConstructor
public class ImportOrderController {

    private final ImportOrderService importOrderService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ImportOrderResponse>>> getAll(
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) OrderStatus status) {
        List<ImportOrderResponse> result;
        if (warehouseId != null) {
            result = importOrderService.getByWarehouse(warehouseId);
        } else if (status != null) {
            result = importOrderService.getByStatus(status);
        } else {
            result = importOrderService.getAll();
        }
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ImportOrderResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(importOrderService.getById(id)));
    }

    // TODO: replace hardcoded userId with value from JWT security context
    @PostMapping
    public ResponseEntity<ApiResponse<ImportOrderResponse>> create(
            @RequestParam Long createdByUserId,
            @Valid @RequestBody ImportOrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Import order created successfully",
                        importOrderService.create(createdByUserId, request)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<ImportOrderResponse>> updateStatus(
            @PathVariable Long id,
            @RequestParam OrderStatus status) {
        return ResponseEntity.ok(ApiResponse.ok("Status updated successfully",
                importOrderService.updateStatus(id, status)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        importOrderService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Import order deleted successfully", null));
    }
}