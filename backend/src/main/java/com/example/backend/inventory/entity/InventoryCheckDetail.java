package com.example.backend.inventory.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "inventory_check_details")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"inventoryCheck", "product"})
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class InventoryCheckDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_check_id", nullable = false)
    private InventoryCheck inventoryCheck;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "original_quantity", nullable = false, precision = 15, scale = 2)
    private BigDecimal originalQuantity;

    @Column(name = "actual_quantity", nullable = false, precision = 15, scale = 2)
    private BigDecimal actualQuantity;

    @Column(name = "difference", nullable = false, precision = 15, scale = 2)
    private BigDecimal difference;

    @Column(columnDefinition = "TEXT")
    private String reason;
}
