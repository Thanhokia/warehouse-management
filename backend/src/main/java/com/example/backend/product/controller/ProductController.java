package com.example.backend.product.controller;

import com.example.backend.common.response.ApiResponse;
import com.example.backend.product.dto.request.ProductRequest;
import com.example.backend.product.dto.response.ProductResponse;
import com.example.backend.product.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getAll(
            @RequestParam(required = false) Boolean activeOnly,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String search) {
        List<ProductResponse> result;
        if (search != null && !search.isBlank()) {
            result = productService.searchByName(search);
        } else if (categoryId != null) {
            result = productService.getByCategory(categoryId);
        } else if (Boolean.TRUE.equals(activeOnly)) {
            result = productService.getAllActive();
        } else {
            result = productService.getAll();
        }
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(productService.getById(id)));
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<ApiResponse<ProductResponse>> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(productService.getByCode(code)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProductResponse>> create(
            @Valid @RequestBody ProductRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Product created successfully", productService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody ProductRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Product updated successfully", productService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        productService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Product deactivated successfully", null));
    }
}