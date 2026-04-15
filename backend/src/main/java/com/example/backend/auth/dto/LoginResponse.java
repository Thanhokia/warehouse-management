package com.example.backend.auth.dto;

import com.example.backend.inventory.entity.User.Role;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoginResponse {
    private String token;
    private Long userId;
    private String username;
    private String fullName;
    private Role role;
}


