package com.stockwise.backend.dto;

import com.stockwise.backend.entity.AdjustmentDirection;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;

public final class StockRequests {
    private StockRequests() {}
    public record OpeningStockRequest(@NotNull Long productId) {}
    public record PurchaseRequest(@NotNull Long productId, @Positive int quantity,
            @NotNull @DecimalMin("0.0") BigDecimal unitPrice, @NotNull Long destinationShelfId,
            @NotBlank @Size(max=160) String reference, @Size(max=1000) String notes,
            Instant effectiveAt) {}
    public record SaleRequest(@NotNull Long productId, @Positive int quantity,
            @NotNull @DecimalMin("0.0") BigDecimal unitPrice, @NotNull Long sourceShelfId,
            @NotBlank @Size(max=160) String reference, @Size(max=1000) String notes,
            Instant effectiveAt) {}
    public record AdjustmentRequest(@NotNull Long productId, @NotNull AdjustmentDirection direction,
            @Positive int quantity, @NotBlank @Size(max=500) String reason,
            Long shelfId, Instant effectiveAt) {}
    public record RackRequest(@NotBlank @Size(max=40) String code, @NotBlank @Size(max=120) String name,
            @Size(max=500) String description) {}
    public record ShelfRequest(@NotBlank @Size(max=60) String code, @NotNull Long rackId,
            @Positive int maxCapacity) {}
    public record AllocateStockRequest(@NotNull Long productId, @Positive int quantity) {}
}
