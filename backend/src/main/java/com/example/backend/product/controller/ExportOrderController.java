package com.example.backend.product.controller;

import com.example.backend.common.response.ApiResponse;
import com.example.backend.product.dto.request.ExportOrderRequest;
import com.example.backend.product.dto.response.ExportOrderResponse;
import com.example.backend.product.entity.ExportOrder.OrderStatus;
import com.example.backend.product.service.ExportOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/export-orders")
@RequiredArgsConstructor
public class ExportOrderController {

    private final ExportOrderService exportOrderService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ExportOrderResponse>>> getAll(
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) OrderStatus status) {
        List<ExportOrderResponse> result;
        if (warehouseId != null) {
            result = exportOrderService.getByWarehouse(warehouseId);
        } else if (status != null) {
            result = exportOrderService.getByStatus(status);
        } else {
            result = exportOrderService.getAll();
        }
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ExportOrderResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(exportOrderService.getById(id)));
    }

    // TODO: replace hardcoded userId with value from JWT security context
    @PostMapping
    public ResponseEntity<ApiResponse<ExportOrderResponse>> create(
            @RequestParam Long createdByUserId,
            @Valid @RequestBody ExportOrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Export order created successfully",
                        exportOrderService.create(createdByUserId, request)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<ExportOrderResponse>> updateStatus(
            @PathVariable Long id,
            @RequestParam OrderStatus status) {
        return ResponseEntity.ok(ApiResponse.ok("Status updated successfully",
                exportOrderService.updateStatus(id, status)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        exportOrderService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Export order deleted successfully", null));
    }
}