package com.stockwise.backend.repository;

import com.stockwise.backend.entity.ShelfInventory;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ShelfInventoryRepository extends JpaRepository<ShelfInventory, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from ShelfInventory i where i.product.id = :productId and i.shelf.id = :shelfId")
    Optional<ShelfInventory> findForUpdate(@Param("productId") Long productId, @Param("shelfId") Long shelfId);
    List<ShelfInventory> findByProduct_Id(Long productId);
    List<ShelfInventory> findByShelf_Id(Long shelfId);
    boolean existsByProduct_IdAndQuantityLessThan(Long productId, int quantity);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from ShelfInventory i where i.shelf.id = :shelfId order by i.id")
    List<ShelfInventory> findByShelfIdForUpdate(@Param("shelfId") Long shelfId);
    @Query("select coalesce(sum(i.quantity), 0) from ShelfInventory i where i.product.id = :productId")
    long sumForProduct(@Param("productId") Long productId);
    @Query("select coalesce(sum(i.quantity), 0) from ShelfInventory i where i.shelf.id = :shelfId")
    long sumForShelf(@Param("shelfId") Long shelfId);

    @Query("select i from ShelfInventory i join fetch i.product join fetch i.shelf s join fetch s.rack order by s.rack.id, s.id, i.product.name, i.id")
    List<ShelfInventory> findAllWithProductAndShelf();

    @Query("select i from ShelfInventory i join fetch i.product join fetch i.shelf s join fetch s.rack where s.id = :shelfId order by i.product.name, i.id")
    List<ShelfInventory> findByShelfIdWithProductAndShelf(@Param("shelfId") Long shelfId);
}
