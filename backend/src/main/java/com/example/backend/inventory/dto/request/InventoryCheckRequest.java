package com.example.backend.inventory.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryCheckRequest {
    
    @NotNull(message = "Warehouse ID is required")
    private Long warehouseId;

    private String note;

    @Size(min = 1, message = "At least one product must be checked")
    private List<InventoryCheckDetailRequest> details;
}
