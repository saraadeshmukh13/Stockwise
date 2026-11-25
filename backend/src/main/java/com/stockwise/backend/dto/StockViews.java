package com.stockwise.backend.dto;

import com.stockwise.backend.entity.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class StockViews {
    private StockViews() {}
    public record TransactionView(Long id, Long productId, String productName, StockTransactionType type,
            AdjustmentDirection direction, int quantity, BigDecimal unitPrice, Instant effectiveAt,
            String reference, String notes, String actorUsername) {
        public static TransactionView from(StockTransaction t) {
            return new TransactionView(t.getId(), t.getProduct().getId(), t.getProduct().getName(), t.getType(),
                    t.getAdjustmentDirection(), t.getQuantity(), t.getUnitPrice(), t.getEffectiveAt(),
                    t.getReference(), t.getNotes(), t.getActorUsername());
        }
    }
    public record RackView(Long id, String code, String name, String description) {
        public static RackView from(WarehouseRack r) { return new RackView(r.getId(), r.getCode(), r.getName(), r.getDescription()); }
    }
    public record ShelfView(Long id, String code, Long rackId, String rackCode, int maxCapacity, long currentQuantity,
            List<ShelfInventoryView> allocations) {
        public static ShelfView from(WarehouseShelf s, long current, List<ShelfInventoryView> allocations) {
            return new ShelfView(s.getId(), s.getCode(), s.getRack().getId(), s.getRack().getCode(), s.getMaxCapacity(), current,
                    allocations == null ? List.of() : List.copyOf(allocations));
        }
    }
    public record ShelfInventoryView(Long productId, String productName, String sku, String category, int quantity,
            int unallocatedQuantity, int totalQuantity, Long shelfId, Long rackId) {}
}
