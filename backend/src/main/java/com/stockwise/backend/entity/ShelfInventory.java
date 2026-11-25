package com.stockwise.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "shelf_inventory", uniqueConstraints = @UniqueConstraint(name = "uk_shelf_inventory_product_shelf", columnNames = {"product_id", "shelf_id"}))
public class ShelfInventory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false, foreignKey = @ForeignKey(name = "fk_shelf_inventory_product"))
    private Product product;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shelf_id", nullable = false, foreignKey = @ForeignKey(name = "fk_shelf_inventory_shelf"))
    private WarehouseShelf shelf;
    @Column(nullable = false)
    private int quantity;

    protected ShelfInventory() {}
    public ShelfInventory(Product product, WarehouseShelf shelf, int quantity) { this.product=product; this.shelf=shelf; this.quantity=quantity; }
    public Long getId() { return id; }
    public Product getProduct() { return product; }
    public WarehouseShelf getShelf() { return shelf; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity=quantity; }
}
