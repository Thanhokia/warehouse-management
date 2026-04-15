package com.example.backend.inventory.repository;

import com.example.backend.inventory.entity.ImportOrder;
import com.example.backend.inventory.entity.ImportOrder.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ImportOrderRepository extends JpaRepository<ImportOrder, Long> {

    Optional<ImportOrder> findByOrderCode(String orderCode);

    boolean existsByOrderCode(String orderCode);

    List<ImportOrder> findByWarehouseId(Long warehouseId);

    List<ImportOrder> findByStatus(OrderStatus status);

    List<ImportOrder> findByCreatedById(Long userId);
}

