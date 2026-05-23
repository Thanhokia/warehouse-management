package com.example.backend.inventory.repository;

import com.example.backend.inventory.entity.InventoryCheck;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InventoryCheckRepository extends JpaRepository<InventoryCheck, Long> {
}
