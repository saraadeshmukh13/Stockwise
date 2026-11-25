
package com.stockwise.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String sku;

    private String category;

    private int quantity;

    @Column(name = "unallocated_quantity", nullable = false, columnDefinition = "integer not null default 0")
    private int unallocatedQuantity;

    private int reorderLevel;

    private BigDecimal price;

    private int dailyDemand;

    // Keep the existing DATE column name for additive-schema compatibility; API semantics are now an exact date.
    @Column(name = "stock_added_month")
    private LocalDate stockAddedDate;

    public Product() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public int getUnallocatedQuantity() { return unallocatedQuantity; }
    public void setUnallocatedQuantity(int unallocatedQuantity) { this.unallocatedQuantity = unallocatedQuantity; }

    public int getReorderLevel() {
        return reorderLevel;
    }

    public void setReorderLevel(int reorderLevel) {
        this.reorderLevel = reorderLevel;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public int getDailyDemand() {
        return dailyDemand;
    }

    public void setDailyDemand(int dailyDemand) {
        this.dailyDemand = dailyDemand;
    }

    public LocalDate getStockAddedDate() { return stockAddedDate; }
    public void setStockAddedDate(LocalDate stockAddedDate) { this.stockAddedDate = stockAddedDate; }
}

