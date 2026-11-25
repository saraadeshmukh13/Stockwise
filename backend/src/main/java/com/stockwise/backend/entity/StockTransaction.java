package com.stockwise.backend.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.Check;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "stock_transactions", indexes = {
    @Index(name = "ix_stock_tx_product_time", columnList = "product_id,effective_at"),
    @Index(name = "ix_stock_tx_type_time", columnList = "transaction_type,effective_at")
})
@Check(name = "ck_stock_tx_opening_key", constraints = "((transaction_type = 'OPENING_STOCK' and opening_stock_product_id = product_id) or (transaction_type <> 'OPENING_STOCK' and opening_stock_product_id is null))")
public class StockTransaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false, foreignKey = @ForeignKey(name = "fk_stock_tx_product"))
    private Product product;
    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 24)
    private StockTransactionType type;
    @Column(nullable = false)
    private int quantity;
    @Enumerated(EnumType.STRING)
    @Column(name = "adjustment_direction", length = 12)
    private AdjustmentDirection adjustmentDirection;
    @Column(name = "unit_price", precision = 19, scale = 4)
    private BigDecimal unitPrice;
    @Column(name = "effective_at", nullable = false)
    private Instant effectiveAt;
    @Column(length = 160)
    private String reference;
    @Column(length = 1000)
    private String notes;
    @Column(name = "actor_username", length = 80)
    private String actorUsername;
    @Column(name = "opening_stock_product_id", unique = true)
    private Long openingStockProductId;

    protected StockTransaction() {}
    public StockTransaction(Product product, StockTransactionType type, int quantity, AdjustmentDirection direction,
            BigDecimal unitPrice, Instant effectiveAt, String reference, String notes, String actorUsername) {
        this.product=product; this.type=type; this.quantity=quantity; this.adjustmentDirection=direction;
        this.unitPrice=unitPrice; this.effectiveAt=effectiveAt; this.reference=reference; this.notes=notes; this.actorUsername=actorUsername;
        if (type == StockTransactionType.OPENING_STOCK) this.openingStockProductId=product.getId();
    }
    public Long getId() { return id; }
    public Product getProduct() { return product; }
    public StockTransactionType getType() { return type; }
    public int getQuantity() { return quantity; }
    public AdjustmentDirection getAdjustmentDirection() { return adjustmentDirection; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public Instant getEffectiveAt() { return effectiveAt; }
    public String getReference() { return reference; }
    public String getNotes() { return notes; }
    public String getActorUsername() { return actorUsername; }
    public Long getOpeningStockProductId() { return openingStockProductId; }

    @PrePersist
    @PreUpdate
    private void validateOpeningStockKey() {
        if (type == StockTransactionType.OPENING_STOCK) {
            if (product == null || product.getId() == null || !product.getId().equals(openingStockProductId)) {
                throw new IllegalStateException("Opening-stock key must match the persisted product id");
            }
        } else if (openingStockProductId != null) {
            throw new IllegalStateException("Only opening-stock transactions may have an opening-stock key");
        }
    }
}
