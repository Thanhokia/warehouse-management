package com.example.backend.inventory.repository;

import com.example.backend.inventory.entity.ExportOrder;
import com.example.backend.inventory.entity.ExportOrder.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExportOrderRepository extends JpaRepository<ExportOrder, Long> {

    Optional<ExportOrder> findByOrderCode(String orderCode);

    boolean existsByOrderCode(String orderCode);

    List<ExportOrder> findByWarehouseId(Long warehouseId);

    List<ExportOrder> findByStatus(OrderStatus status);

    List<ExportOrder> findByCreatedById(Long userId);
}

