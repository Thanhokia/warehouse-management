package com.example.backend.product.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "products")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"category", "stockItems", "importOrderDetails", "exportOrderDetails"})
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 30)
    private String unit; // đơn vị: kg, lít, cái, thùng...

    @Column(name = "min_stock_level", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal minStockLevel = BigDecimal.ZERO; // ngưỡng cảnh báo tồn kho

    @Column(precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal price = BigDecimal.ZERO; // giá nhập tham chiếu

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "product", fetch = FetchType.LAZY)
    private List<StockItem> stockItems;

    @OneToMany(mappedBy = "product", fetch = FetchType.LAZY)
    private List<ImportOrderDetail> importOrderDetails;

    @OneToMany(mappedBy = "product", fetch = FetchType.LAZY)
    private List<ExportOrderDetail> exportOrderDetails;
}