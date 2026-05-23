package com.example.backend.inventory.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityLogRequest {
    @NotBlank(message = "Action is required")
    private String action;
    
    @NotBlank(message = "Status is required")
    private String status;
    
    @NotBlank(message = "Detail is required")
    private String detail;
}
