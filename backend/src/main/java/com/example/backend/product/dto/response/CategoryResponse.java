package com.example.backend.product.dto.response;

import com.example.backend.product.entity.Category.CategoryType;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class CategoryResponse {
    private Long id;
    private String name;
    private String description;
    private CategoryType type;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}