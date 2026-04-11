package com.example.backend.product.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock_items",
        uniqueConstraints = @UniqueConstraint(columnNames = {"warehouse_id", "product_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"warehouse", "product"})
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class StockItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal quantity = BigDecimal.ZERO;

    @UpdateTimestamp
    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    @Transient
    public boolean isBelowMinLevel() {
        if (product == null || product.getMinStockLevel() == null) return false;
        return quantity.compareTo(product.getMinStockLevel()) < 0;
    }
}