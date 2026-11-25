package com.stockwise.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "warehouse_shelves", uniqueConstraints = @UniqueConstraint(name = "uk_shelf_code", columnNames = "code"))
public class WarehouseShelf {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 60)
    private String code;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rack_id", nullable = false, foreignKey = @ForeignKey(name = "fk_shelf_rack"))
    private WarehouseRack rack;
    @Column(name = "max_capacity", nullable = false)
    private int maxCapacity;
    @Column(name = "used_capacity", nullable = false, columnDefinition = "integer not null default 0")
    private int usedCapacity;

    protected WarehouseShelf() {}
    public WarehouseShelf(String code, WarehouseRack rack, int maxCapacity) { this.code=code; this.rack=rack; this.maxCapacity=maxCapacity; }
    public Long getId() { return id; }
    public String getCode() { return code; }
    public WarehouseRack getRack() { return rack; }
    public int getMaxCapacity() { return maxCapacity; }
    public int getUsedCapacity() { return usedCapacity; }
    public void addUsage(int quantity) {
        if (quantity <= 0) throw new IllegalArgumentException("Shelf usage increase must be positive");
        int next = Math.addExact(usedCapacity, quantity);
        if (next > maxCapacity) throw new IllegalStateException("Shelf usage exceeds maximum capacity");
        usedCapacity = next;
    }
    public void removeUsage(int quantity) {
        if (quantity <= 0 || quantity > usedCapacity) throw new IllegalStateException("Shelf usage cannot become negative");
        usedCapacity = Math.subtractExact(usedCapacity, quantity);
    }
    public void reconcileUsage(long quantity) {
        if (quantity < 0 || quantity > Integer.MAX_VALUE) throw new IllegalArgumentException("Shelf allocation total is outside the supported range");
        usedCapacity = (int) quantity;
    }
}
