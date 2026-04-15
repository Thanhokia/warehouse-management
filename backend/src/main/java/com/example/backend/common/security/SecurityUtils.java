package com.example.backend.common.security;

import com.example.backend.common.exception.ResourceNotFoundException;
import com.example.backend.inventory.entity.User;
import com.example.backend.inventory.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SecurityUtils {

    private final UserRepository userRepository;

    /**
     * Lấy username của người dùng đang đăng nhập từ JWT SecurityContext.
     */
    public String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("No authenticated user found");
        }
        return authentication.getName();
    }

    /**
     * Lấy User entity của người dùng đang đăng nhập.
     */
    public User getCurrentUser() {
        String username = getCurrentUsername();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }

    /**
     * Lấy userId của người dùng đang đăng nhập.
     */
    public Long getCurrentUserId() {
        return getCurrentUser().getId();
    }
}