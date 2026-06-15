package com.example.backend.inventory.service;

import com.example.backend.inventory.dto.response.ActivityLogResponse;
import com.example.backend.inventory.entity.ActivityLog;
import com.example.backend.inventory.entity.User;
import com.example.backend.inventory.repository.ActivityLogRepository;
import com.example.backend.inventory.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ActivityLogResponse> getRecentActivities() {
        return activityLogRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(log -> {
                    String display = log.getUser() != null
                            ? log.getUser().getFullName() + " (" + log.getUser().getUsername() + ")"
                            : log.getUsername();
                    return ActivityLogResponse.builder()
                            .id(log.getId())
                            .username(display)
                            .action(log.getAction())
                            .status(log.getStatus())
                            .detail(log.getDetail())
                            .createdAt(log.getCreatedAt())
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public void logAction(String action, String status, String detail) {
        String displayName = "Hệ thống";
        User actionUser = null;
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()
                && !authentication.getPrincipal().equals("anonymousUser")) {
            String username = authentication.getName();
            displayName = username;

            User user = userRepository.findByUsername(username).orElse(null);
            if (user != null) {
                actionUser = user;
                if (user.getFullName() != null && !user.getFullName().trim().isEmpty()) {
                    displayName = user.getFullName() + " (" + username + ")";
                }
            }
        }

        ActivityLog log = ActivityLog.builder()
                .user(actionUser)
                .username(displayName)
                .action(action)
                .status(status)
                .detail(detail)
                .build();

        activityLogRepository.save(log);
    }

    @Transactional
    public void logActionWithUser(String username, String action, String status, String detail) {
        String displayName = username;
        User actionUser = null;
        User user = userRepository.findByUsername(username).orElse(null);
        if (user != null) {
            actionUser = user;
            if (user.getFullName() != null && !user.getFullName().trim().isEmpty()) {
                displayName = user.getFullName() + " (" + username + ")";
            }
        }

        ActivityLog log = ActivityLog.builder()
                .user(actionUser)
                .username(displayName)
                .action(action)
                .status(status)
                .detail(detail)
                .build();
        activityLogRepository.save(log);
    }

    @PostConstruct
    @Transactional
    public void migrateOldData() {
        List<ActivityLog> logs = activityLogRepository.findAll();
        boolean needsUpdate = false;
        for (ActivityLog log : logs) {
            if (log.getUser() == null && log.getUsername() != null && !log.getUsername().equals("Hệ thống")) {
                String rawName = log.getUsername();
                String extractedUsername = rawName;
                if (rawName.contains("(") && rawName.contains(")")) {
                    extractedUsername = rawName.substring(rawName.lastIndexOf("(") + 1, rawName.lastIndexOf(")"));
                }
                User user = userRepository.findByUsername(extractedUsername).orElse(null);
                if (user != null) {
                    log.setUser(user);
                    needsUpdate = true;
                }
            }
        }
        if (needsUpdate) {
            activityLogRepository.saveAll(logs);
        }
    }
}
