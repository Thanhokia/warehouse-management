package com.example.backend.inventory.controller;

import com.example.backend.common.response.ApiResponse;
import com.example.backend.inventory.dto.request.InventoryCheckRequest;
import com.example.backend.inventory.dto.response.InventoryCheckResponse;
import com.example.backend.inventory.service.InventoryCheckService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Inventory Check")
@RestController
@RequestMapping("/api/inventory-checks")
@RequiredArgsConstructor
public class InventoryCheckController {

    private final InventoryCheckService inventoryCheckService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<List<InventoryCheckResponse>>> getAllChecks() {
        return ResponseEntity.ok(ApiResponse.ok("Retrieved all checks successfully", inventoryCheckService.getAllChecks()));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<InventoryCheckResponse>> createCheck(
            @Valid @RequestBody InventoryCheckRequest request,
            Authentication authentication) {
        
        String username = authentication.getName();
        InventoryCheckResponse response = inventoryCheckService.createCheck(request, username);
        return ResponseEntity.ok(ApiResponse.ok("Created inventory check successfully", response));
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<InventoryCheckResponse>> approveCheck(
            @PathVariable Long id,
            Authentication authentication) {
        
        String username = authentication.getName();
        InventoryCheckResponse response = inventoryCheckService.approveCheck(id, username);
        return ResponseEntity.ok(ApiResponse.ok("Approved inventory check successfully", response));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<InventoryCheckResponse>> rejectCheck(
            @PathVariable Long id,
            Authentication authentication) {
        
        String username = authentication.getName();
        InventoryCheckResponse response = inventoryCheckService.rejectCheck(id, username);
        return ResponseEntity.ok(ApiResponse.ok("Rejected inventory check successfully", response));
    }
}
