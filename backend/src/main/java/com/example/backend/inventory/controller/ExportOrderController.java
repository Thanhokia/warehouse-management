package com.example.backend.inventory.controller;

import com.example.backend.common.response.ApiResponse;
import com.example.backend.common.security.SecurityUtils;
import com.example.backend.inventory.dto.request.ExportOrderRequest;
import com.example.backend.inventory.dto.response.ExportOrderResponse;
import com.example.backend.inventory.entity.ExportOrder.OrderStatus;
import com.example.backend.inventory.service.ExportOrderService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Export Order")
@RestController
@RequestMapping("/api/export-orders")
@RequiredArgsConstructor
public class ExportOrderController {

    private final ExportOrderService exportOrderService;
    private final SecurityUtils securityUtils;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
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
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<ExportOrderResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(exportOrderService.getById(id)));
    }

    // TODO: replace hardcoded userId with value from JWT security context
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<ExportOrderResponse>> create(

            @Valid @RequestBody ExportOrderRequest request) {
        Long currentUserId = securityUtils.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Export order created successfully",
                        exportOrderService.create(currentUserId, request)));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ExportOrderResponse>> updateStatus(
            @PathVariable Long id,
            @RequestParam OrderStatus status) {
        return ResponseEntity.ok(ApiResponse.ok("Status updated successfully",
                exportOrderService.updateStatus(id, status)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        exportOrderService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Export order deleted successfully", null));
    }
}

