package com.stockwise.backend.controller;

import com.stockwise.backend.dto.StockRequests.*;
import com.stockwise.backend.dto.StockViews.RackView;
import com.stockwise.backend.dto.StockViews.ShelfInventoryView;
import com.stockwise.backend.dto.StockViews.ShelfView;
import com.stockwise.backend.service.StockService;
import com.stockwise.backend.service.WarehouseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/warehouse")
public class WarehouseController {
    private final WarehouseService warehouse;
    private final StockService stock;
    public WarehouseController(WarehouseService warehouse, StockService stock) { this.warehouse=warehouse; this.stock=stock; }

    @GetMapping("/racks")
    public List<RackView> racks() { return warehouse.racks(); }
    @PostMapping("/racks")
    @ResponseStatus(HttpStatus.CREATED)
    public RackView createRack(@Valid @RequestBody RackRequest request) { return warehouse.createRack(request); }
    @GetMapping("/shelves")
    public List<ShelfView> shelves() { return warehouse.shelves(); }
    @PostMapping("/shelves")
    @ResponseStatus(HttpStatus.CREATED)
    public ShelfView createShelf(@Valid @RequestBody ShelfRequest request) {
        return warehouse.createShelf(request);
    }
    @GetMapping("/shelves/{shelfId}/inventory")
    public List<ShelfInventoryView> shelfInventory(@PathVariable Long shelfId) {
        warehouse.shelfQuantity(shelfId);
        return stock.shelfInventory(shelfId);
    }
    @PostMapping("/shelves/{shelfId}/inventory")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void allocate(@PathVariable Long shelfId, @Valid @RequestBody AllocateStockRequest request) {
        stock.allocate(request.productId(), shelfId, request.quantity());
    }
}
