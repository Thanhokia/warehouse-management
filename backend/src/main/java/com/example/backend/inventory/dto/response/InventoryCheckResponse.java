package com.example.backend.inventory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryCheckResponse {
    private Long id;
    private String code;
    private Long warehouseId;
    private String warehouseName;
    private String createdBy;
    private String status;
    private LocalDateTime checkDate;
    private String note;
    private LocalDateTime createdAt;
    private List<InventoryCheckDetailResponse> details;
}
