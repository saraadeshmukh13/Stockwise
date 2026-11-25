package com.stockwise.backend.repository;

import com.stockwise.backend.entity.WarehouseRack;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface WarehouseRackRepository extends JpaRepository<WarehouseRack, Long> {
    Optional<WarehouseRack> findByCode(String code);
}
