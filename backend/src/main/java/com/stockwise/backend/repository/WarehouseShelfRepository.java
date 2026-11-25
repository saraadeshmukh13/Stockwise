package com.stockwise.backend.repository;

import com.stockwise.backend.entity.WarehouseShelf;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.List;

public interface WarehouseShelfRepository extends JpaRepository<WarehouseShelf, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from WarehouseShelf s where s.id = :id")
    Optional<WarehouseShelf> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from WarehouseShelf s order by s.id")
    List<WarehouseShelf> findAllForUpdateInIdOrder();

    Optional<WarehouseShelf> findByCode(String code);
}
