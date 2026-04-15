package com.example.backend.inventory.dto.request;

import com.example.backend.inventory.entity.Category.CategoryType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CategoryRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String description;

    @NotNull(message = "Type is required")
    private CategoryType type;

    private Boolean isActive = true;
}

