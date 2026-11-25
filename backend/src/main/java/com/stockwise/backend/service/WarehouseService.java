package com.stockwise.backend.service;

import com.stockwise.backend.dto.StockRequests.RackRequest;
import com.stockwise.backend.dto.StockRequests.ShelfRequest;
import com.stockwise.backend.dto.StockViews.RackView;
import com.stockwise.backend.dto.StockViews.ShelfInventoryView;
import com.stockwise.backend.dto.StockViews.ShelfView;
import com.stockwise.backend.entity.ShelfInventory;
import com.stockwise.backend.repository.ShelfInventoryRepository;
import com.stockwise.backend.repository.WarehouseRackRepository;
import com.stockwise.backend.repository.WarehouseShelfRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class WarehouseService {
    private final WarehouseRackRepository racks;
    private final WarehouseShelfRepository shelves;
    private final ShelfInventoryRepository shelfInventory;

    public WarehouseService(WarehouseRackRepository racks, WarehouseShelfRepository shelves, ShelfInventoryRepository shelfInventory) {
        this.racks = racks;
        this.shelves = shelves;
        this.shelfInventory = shelfInventory;
    }

    @Transactional
    public RackView createRack(RackRequest r) {
        return RackView.from(racks.save(new com.stockwise.backend.entity.WarehouseRack(r.code().trim(), r.name().trim(), r.description())));
    }

    @Transactional(readOnly = true)
    public List<RackView> racks() { return racks.findAll().stream().map(RackView::from).toList(); }

    @Transactional
    public ShelfView createShelf(ShelfRequest r) {
        var rack = racks.findById(r.rackId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rack not found"));
        var shelf = shelves.save(new com.stockwise.backend.entity.WarehouseShelf(r.code().trim(), rack, r.maxCapacity()));
        return ShelfView.from(shelf, shelf.getUsedCapacity(), List.of());
    }

    @Transactional(readOnly = true)
    public List<ShelfView> shelves() {
        Map<Long, List<ShelfInventoryView>> allocationsByShelf = shelfInventory.findAllWithProductAndShelf().stream()
                .collect(Collectors.groupingBy(i -> i.getShelf().getId(),
                        Collectors.mapping(this::toShelfInventoryView, Collectors.toList())));
        return shelves.findAll().stream()
                .map(s -> ShelfView.from(s, s.getUsedCapacity(), allocationsByShelf.getOrDefault(s.getId(), List.of())))
                .toList();
    }

    @Transactional(readOnly = true)
    public long shelfQuantity(Long shelfId) {
        if (!shelves.existsById(shelfId)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Shelf not found");
        return shelves.findById(shelfId).orElseThrow().getUsedCapacity();
    }

    private ShelfInventoryView toShelfInventoryView(ShelfInventory i) {
        var p = i.getProduct();
        return new ShelfInventoryView(p.getId(), p.getName(), p.getSku(), p.getCategory(), i.getQuantity(),
                p.getUnallocatedQuantity(), p.getQuantity(), i.getShelf().getId(), i.getShelf().getRack().getId());
    }
}
