package com.example.backend.inventory.service;

import com.example.backend.inventory.dto.response.ActivityLogResponse;
import com.example.backend.inventory.entity.ActivityLog;
import com.example.backend.inventory.repository.ActivityLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;

    @Transactional(readOnly = true)
    public List<ActivityLogResponse> getRecentActivities() {
        return activityLogRepository.findTop100ByOrderByCreatedAtDesc().stream()
                .map(log -> ActivityLogResponse.builder()
                        .id(log.getId())
                        .username(log.getUsername())
                        .action(log.getAction())
                        .status(log.getStatus())
                        .detail(log.getDetail())
                        .createdAt(log.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public void logAction(String action, String status, String detail) {
        String username = "Hệ thống";
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && !authentication.getPrincipal().equals("anonymousUser")) {
            username = authentication.getName();
        }

        ActivityLog log = ActivityLog.builder()
                .username(username)
                .action(action)
                .status(status)
                .detail(detail)
                .build();
        
        activityLogRepository.save(log);
    }
    
    @Transactional
    public void logActionWithUser(String username, String action, String status, String detail) {
        ActivityLog log = ActivityLog.builder()
                .username(username)
                .action(action)
                .status(status)
                .detail(detail)
                .build();
        activityLogRepository.save(log);
    }
}
