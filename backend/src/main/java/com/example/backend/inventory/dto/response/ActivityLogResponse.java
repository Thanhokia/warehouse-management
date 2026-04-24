package com.example.backend.inventory.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class ActivityLogResponse {
    private Long id;
    private String username;
    private String action;
    private String status;
    private String detail;
    private LocalDateTime createdAt;
}
