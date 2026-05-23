package com.example.backend.inventory.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "inventory_checks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"warehouse", "createdBy", "details"})
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class InventoryCheck {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private CheckStatus status = CheckStatus.PENDING;

    @Column(name = "check_date")
    private LocalDateTime checkDate;

    @Column(columnDefinition = "TEXT")
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "inventoryCheck", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<InventoryCheckDetail> details = new ArrayList<>();

    public enum CheckStatus {
        PENDING,    // Chờ duyệt
        COMPLETED,  // Đã hoàn thành (đã duyệt)
        REJECTED    // Đã từ chối
    }
}
