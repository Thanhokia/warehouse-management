package com.example.backend.inventory.repository;

import com.example.backend.inventory.entity.StockItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockItemRepository extends JpaRepository<StockItem, Long> {

    Optional<StockItem> findByWarehouseIdAndProductId(Long warehouseId, Long productId);

    List<StockItem> findByWarehouseId(Long warehouseId);

    List<StockItem> findByProductId(Long productId);

    // Lấy tất cả stock item có tồn kho dưới ngưỡng cảnh báo
    @Query("SELECT s FROM StockItem s WHERE s.quantity <= s.product.minStockLevel")
    List<StockItem> findAllBelowMinLevel();

    // Lấy stock item dưới ngưỡng cảnh báo theo kho
    @Query("SELECT s FROM StockItem s WHERE s.warehouse.id = :warehouseId AND s.quantity <= s.product.minStockLevel")
    List<StockItem> findBelowMinLevelByWarehouse(Long warehouseId);
}

