package com.stockwise.backend.repository;

import com.stockwise.backend.entity.StockTransaction;
import com.stockwise.backend.entity.StockTransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.time.Instant;
import java.util.List;

public interface StockTransactionRepository extends JpaRepository<StockTransaction, Long> {
    boolean existsByProduct_IdAndType(Long productId, StockTransactionType type);
    boolean existsByProduct_Id(Long productId);
    Optional<StockTransaction> findFirstByProduct_IdAndType(Long productId, StockTransactionType type);

    @Query("select t from StockTransaction t where (:productId is null or t.product.id = :productId) and (:type is null or t.type = :type) and (:from is null or t.effectiveAt >= :from) and (:toExclusive is null or t.effectiveAt < :toExclusive) order by t.effectiveAt desc, t.id desc")
    Page<StockTransaction> search(@Param("productId") Long productId,
                                  @Param("type") StockTransactionType type,
                                  @Param("from") Instant from,
                                  @Param("toExclusive") Instant toExclusive,
                                  Pageable pageable);

    @EntityGraph(attributePaths = "product")
    List<StockTransaction> findByEffectiveAtGreaterThanEqualAndEffectiveAtLessThanOrderByEffectiveAtAscIdAsc(
            Instant fromInclusive, Instant toExclusive);
}
