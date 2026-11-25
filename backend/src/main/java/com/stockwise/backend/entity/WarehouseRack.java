package com.stockwise.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "warehouse_racks", uniqueConstraints = @UniqueConstraint(name = "uk_rack_code", columnNames = "code"))
public class WarehouseRack {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 40)
    private String code;
    @Column(nullable = false, length = 120)
    private String name;
    @Column(length = 500)
    private String description;

    protected WarehouseRack() {}
    public WarehouseRack(String code, String name, String description) { this.code=code; this.name=name; this.description=description; }
    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public String getDescription() { return description; }
}
