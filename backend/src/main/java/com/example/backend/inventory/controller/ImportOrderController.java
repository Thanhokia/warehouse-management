package com.example.backend.inventory.controller;

import com.example.backend.common.security.SecurityUtils;
import com.example.backend.common.response.ApiResponse;
import com.example.backend.inventory.dto.request.ImportOrderRequest;
import com.example.backend.inventory.dto.response.ImportOrderResponse;
import com.example.backend.inventory.entity.ImportOrder.OrderStatus;
import com.example.backend.inventory.service.ImportOrderService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Import Order")
@RestController
@RequestMapping("/api/import-orders")
@RequiredArgsConstructor
public class ImportOrderController {

    private final ImportOrderService importOrderService;
    private final SecurityUtils securityUtils;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
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
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<ImportOrderResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(importOrderService.getById(id)));
    }

    // TODO: replace hardcoded userId with value from JWT security context
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<ImportOrderResponse>> create(
            @Valid @RequestBody ImportOrderRequest request) {
        Long currentUserId = securityUtils.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Import order created successfully",
                        importOrderService.create(currentUserId, request)));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ImportOrderResponse>> updateStatus(
            @PathVariable Long id,
            @RequestParam OrderStatus status) {
        return ResponseEntity.ok(ApiResponse.ok("Status updated successfully",
                importOrderService.updateStatus(id, status)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        importOrderService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Import order deleted successfully", null));
    }
}

