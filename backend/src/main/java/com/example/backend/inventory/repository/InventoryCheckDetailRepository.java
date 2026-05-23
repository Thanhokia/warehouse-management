package com.example.backend.inventory.repository;

import com.example.backend.inventory.entity.InventoryCheckDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryCheckDetailRepository extends JpaRepository<InventoryCheckDetail, Long> {
    List<InventoryCheckDetail> findByInventoryCheckId(Long checkId);
}
