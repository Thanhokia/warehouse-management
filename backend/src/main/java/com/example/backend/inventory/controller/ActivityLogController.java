package com.example.backend.inventory.controller;

import com.example.backend.common.response.ApiResponse;
import com.example.backend.inventory.dto.response.ActivityLogResponse;
import com.example.backend.inventory.service.ActivityLogService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Activity Log")
@RestController
@RequestMapping("/api/activities")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ActivityLogController {

    private final ActivityLogService activityLogService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ActivityLogResponse>>> getRecentActivities() {
        return ResponseEntity
                .ok(ApiResponse.ok("Activities retrieved successfully", activityLogService.getRecentActivities()));
    }

    @org.springframework.web.bind.annotation.PostMapping("/log")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<Void>> logActivity(
            @org.springframework.web.bind.annotation.RequestBody @jakarta.validation.Valid com.example.backend.inventory.dto.request.ActivityLogRequest request,
            org.springframework.security.core.Authentication authentication) {

        String username = authentication != null ? authentication.getName() : "System";
        activityLogService.logActionWithUser(username, request.getAction(), request.getStatus(), request.getDetail());
        return ResponseEntity.ok(ApiResponse.ok("Activity logged successfully", null));
    }
}
