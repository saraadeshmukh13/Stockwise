package com.stockwise.backend.service;

import com.stockwise.backend.dto.StockRequests.*;
import com.stockwise.backend.dto.StockViews.*;
import com.stockwise.backend.entity.*;
import com.stockwise.backend.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.time.Instant;
import java.time.ZoneId;
import java.math.BigDecimal;
import java.util.List;
import java.util.HashMap;
import java.util.Map;

@Service
public class StockService {
    public static final LocalDate OPENING_DATE = LocalDate.of(2026, 11, 23);
    public static final ZoneId REPORTING_ZONE = ZoneId.of("Asia/Kolkata");
    public static final Instant OPENING_INSTANT = OPENING_DATE.atStartOfDay(REPORTING_ZONE).toInstant();
    private final ProductRepository products;
    private final StockTransactionRepository transactions;
    private final WarehouseShelfRepository shelves;
    private final ShelfInventoryRepository allocations;
    private final com.stockwise.backend.repository.WarehouseRackRepository racks;

    public StockService(ProductRepository products, StockTransactionRepository transactions,
            WarehouseShelfRepository shelves, ShelfInventoryRepository allocations,
            com.stockwise.backend.repository.WarehouseRackRepository racks) {
        this.products=products; this.transactions=transactions; this.shelves=shelves; this.allocations=allocations; this.racks=racks;
    }

    @Transactional
    public void initializeLegacyProducts() {
        // Keep the same global order as stock movements: products, then shelves, then allocations.
        List<Product> lockedProducts = products.findAllForUpdateInIdOrder();
        List<WarehouseShelf> lockedShelves = shelves.findAllForUpdateInIdOrder();
        Map<Long, Long> allocatedByProduct = new HashMap<>();

        for (WarehouseShelf shelf : lockedShelves) {
            long allocated = 0;
            for (ShelfInventory row : allocations.findByShelfIdForUpdate(shelf.getId())) {
                if (row.getQuantity() < 0) {
                    throw new IllegalStateException("Inventory initialization failed: negative allocation on shelf " + shelf.getCode());
                }
                allocated = Math.addExact(allocated, row.getQuantity());
                Long productId = row.getProduct().getId();
                allocatedByProduct.merge(productId, (long) row.getQuantity(), Math::addExact);
            }
            if (allocated > shelf.getMaxCapacity()) {
                throw new IllegalStateException("Inventory initialization failed: shelf " + shelf.getCode()
                        + " allocation total " + allocated + " exceeds capacity " + shelf.getMaxCapacity());
            }
            shelf.reconcileUsage(allocated);
        }

        for (Product p : lockedProducts) {
            boolean legacyDateMissing = p.getStockAddedDate() == null;
            long allocated = allocatedByProduct.getOrDefault(p.getId(), 0L);
            if (p.getQuantity() < 0 || allocated < 0 || allocated > p.getQuantity()) {
                throw new IllegalStateException("Inventory initialization failed: product " + p.getSku()
                        + " has quantity " + p.getQuantity() + " and shelf allocation total " + allocated);
            }
            p.setUnallocatedQuantity(Math.toIntExact(p.getQuantity() - allocated));
            StockTransaction opening = transactions.findFirstByProduct_IdAndType(p.getId(), StockTransactionType.OPENING_STOCK).orElse(null);
            if (opening != null) {
                // The opening ledger timestamp is authoritative for legacy rows. Never rewrite that transaction.
                p.setStockAddedDate(LocalDate.ofInstant(opening.getEffectiveAt(), REPORTING_ZONE));
            } else if (p.getStockAddedDate() == null) {
                p.setStockAddedDate(OPENING_DATE);
            }
            if (opening == null) {
                Instant openingAt = legacyDateMissing ? OPENING_INSTANT : startOfReportingDate(p.getStockAddedDate());
                transactions.save(new StockTransaction(p, StockTransactionType.OPENING_STOCK, p.getQuantity(), null,
                        null, openingAt, "INITIAL_BALANCE", "Opening quantity copied from product balance", null));
            } else if (!p.getId().equals(opening.getOpeningStockProductId())) {
                throw new IllegalStateException("Inventory initialization failed: invalid opening-stock key for product " + p.getSku());
            }
        }
    }

    @Transactional
    public void initializeWarehouseLayoutAndAllocations() {
        if (racks.count() == 0) {
            createDefaultWarehouseLayout();
        }
        allocateUnallocatedStockToAvailableShelves();
    }

    private void createDefaultWarehouseLayout() {
        Object[][] rackDefs = {
                {"RACK-A", "Electronics & Cables", "High-turn electronics, chargers, and cable inventory"},
                {"RACK-B", "Accessories & Peripherals", "Computer accessories and peripheral stock"},
                {"RACK-C", "Bulk & Overflow", "Bulk units and overflow inventory with easy access"}
        };
        String[][] shelfCodes = {
                {"A-01", "A-02", "A-03", "A-04"},
                {"B-01", "B-02", "B-03", "B-04"},
                {"C-01", "C-02", "C-03", "C-04"}
        };
        int[] capacities = {20, 20, 20, 20};
        for (int i = 0; i < rackDefs.length; i++) {
            String code = (String) rackDefs[i][0];
            WarehouseRack rack = racks.findByCode(code).orElseGet(() ->
                    racks.save(new WarehouseRack(code, (String) rackDefs[i][1], (String) rackDefs[i][2])));
            for (int j = 0; j < shelfCodes[i].length; j++) {
                String shelfCode = shelfCodes[i][j];
                if (shelves.findByCode(shelfCode).isEmpty()) {
                    shelves.save(new WarehouseShelf(shelfCode, rack, capacities[j]));
                }
            }
        }
    }

    private void allocateUnallocatedStockToAvailableShelves() {
        List<Product> lockedProducts = products.findAllForUpdateInIdOrder();
        List<WarehouseShelf> lockedShelves = shelves.findAllForUpdateInIdOrder();
        if (lockedProducts.isEmpty() || lockedShelves.isEmpty()) return;
        for (Product product : lockedProducts) {
            int remaining = product.getUnallocatedQuantity();
            if (remaining <= 0) continue;
            for (WarehouseShelf shelf : lockedShelves) {
                if (remaining <= 0) break;
                int shelfRemaining = shelf.getMaxCapacity() - shelf.getUsedCapacity();
                if (shelfRemaining <= 0) continue;
                int toAllocate = Math.min(remaining, shelfRemaining);
                ShelfInventory allocation = allocations.findForUpdate(product.getId(), shelf.getId()).orElse(null);
                if (allocation == null) allocation = new ShelfInventory(product, shelf, 0);
                allocation.setQuantity(Math.addExact(allocation.getQuantity(), toAllocate));
                allocations.save(allocation);
                shelf.addUsage(toAllocate);
                product.setUnallocatedQuantity(product.getUnallocatedQuantity() - toAllocate);
                remaining -= toAllocate;
            }
            if (product.getUnallocatedQuantity() < 0) {
                throw new IllegalStateException("Warehouse initialization failed: negative unallocated stock for product " + product.getSku());
            }
        }
    }

    @Transactional
    public Product createProduct(Product product, String actor) {
        int initial = product.getQuantity();
        if (initial < 0) throw bad("Product quantity cannot be negative");
        validateStockAddedDate(product.getStockAddedDate());
        product.setId(null);
        product.setUnallocatedQuantity(initial);
        Product saved = products.save(product);
        ensureOpeningLocked(saved, initial, startOfReportingDate(saved.getStockAddedDate()), actor);
        return saved;
    }

    @Transactional
    public TransactionView recordOpeningStock(Long productId, String actor) {
        Product product = lockProduct(productId);
        StockTransaction existing = transactions.findFirstByProduct_IdAndType(productId, StockTransactionType.OPENING_STOCK).orElse(null);
        if (existing != null) return TransactionView.from(existing);
        if (product.getQuantity() < 0) throw conflict("Product quantity cannot be negative");
        long located = allocations.sumForProduct(productId);
        if (located < 0 || allocations.existsByProduct_IdAndQuantityLessThan(productId, 0)
                || located > product.getQuantity()) throw conflict("Shelf allocations are invalid for product quantity");
        product.setUnallocatedQuantity(Math.toIntExact(product.getQuantity() - located));
        StockTransaction tx = new StockTransaction(product, StockTransactionType.OPENING_STOCK,
                product.getQuantity(), null, null, OPENING_INSTANT,
                "INITIAL_BALANCE", "Opening quantity copied from existing product balance", actor);
        return TransactionView.from(transactions.save(tx));
    }

    @Transactional
    public TransactionView purchase(PurchaseRequest r, String actor) {
        Product p = lockProduct(r.productId());
        Instant at = movementTime(r.effectiveAt(), p);
        WarehouseShelf shelf = lockShelf(r.destinationShelfId());
        assertInvariant(p);
        if ((long) shelf.getUsedCapacity() + r.quantity() > shelf.getMaxCapacity()) throw conflict("Purchase exceeds destination shelf capacity");
        ShelfInventory allocation = allocations.findForUpdate(p.getId(), shelf.getId()).orElse(null);
        if (allocation == null) allocation = new ShelfInventory(p, shelf, 0);
        allocation.setQuantity(Math.addExact(allocation.getQuantity(), r.quantity()));
        allocations.save(allocation);
        shelf.addUsage(r.quantity());
        p.setQuantity(Math.addExact(p.getQuantity(), r.quantity()));
        StockTransaction tx = record(p, StockTransactionType.PURCHASE, r.quantity(), null, r.unitPrice(), at, r.reference(), r.notes(), actor);
        assertInvariant(p);
        return TransactionView.from(tx);
    }

    @Transactional
    public TransactionView sale(SaleRequest r, String actor) {
        Product p = lockProduct(r.productId());
        Instant at = movementTime(r.effectiveAt(), p);
        WarehouseShelf shelf = lockShelf(r.sourceShelfId());
        assertInvariant(p);
        ShelfInventory allocation = allocations.findForUpdate(p.getId(), shelf.getId())
                .orElseThrow(() -> conflict("Selected shelf has no allocation for this product"));
        if (allocation.getQuantity() < r.quantity() || p.getQuantity() < r.quantity()) throw conflict("Insufficient stock on selected shelf or product");
        allocation.setQuantity(allocation.getQuantity() - r.quantity());
        if (allocation.getQuantity() == 0) allocations.delete(allocation); else allocations.save(allocation);
        shelf.removeUsage(r.quantity());
        p.setQuantity(p.getQuantity() - r.quantity());
        StockTransaction tx = record(p, StockTransactionType.SALE, r.quantity(), null, r.unitPrice(), at, r.reference(), r.notes(), actor);
        assertInvariant(p);
        return TransactionView.from(tx);
    }

    @Transactional
    public TransactionView adjust(AdjustmentRequest r, String actor) {
        Product p = lockProduct(r.productId());
        Instant at = movementTime(r.effectiveAt(), p);
        assertInvariant(p);
        WarehouseShelf shelf = r.shelfId() == null ? null : lockShelf(r.shelfId());
        ShelfInventory allocation = shelf == null ? null : allocations.findForUpdate(p.getId(), shelf.getId()).orElse(null);
        int delta = r.direction() == AdjustmentDirection.INCREASE ? r.quantity() : -r.quantity();
        if (delta < 0 && p.getQuantity() < r.quantity()) throw conflict("Adjustment would make product stock negative");
        if (shelf == null) {
            if (delta < 0 && p.getUnallocatedQuantity() < r.quantity()) throw conflict("Insufficient unallocated stock for decrease");
            p.setUnallocatedQuantity(Math.addExact(p.getUnallocatedQuantity(), delta));
        } else if (delta > 0) {
            if ((long) shelf.getUsedCapacity() + r.quantity() > shelf.getMaxCapacity()) throw conflict("Adjustment exceeds shelf capacity");
            if (allocation == null) allocation = new ShelfInventory(p, shelf, 0);
            allocation.setQuantity(Math.addExact(allocation.getQuantity(), r.quantity()));
            allocations.save(allocation);
            shelf.addUsage(r.quantity());
        } else {
            if (allocation == null || allocation.getQuantity() < r.quantity()) throw conflict("Insufficient stock on selected shelf");
            allocation.setQuantity(allocation.getQuantity() - r.quantity());
            if (allocation.getQuantity() == 0) allocations.delete(allocation); else allocations.save(allocation);
            shelf.removeUsage(r.quantity());
        }
        p.setQuantity(Math.addExact(p.getQuantity(), delta));
        StockTransaction tx = record(p, StockTransactionType.ADJUSTMENT, r.quantity(), r.direction(), null,
                at, null, r.reason(), actor);
        assertInvariant(p);
        return TransactionView.from(tx);
    }

    @Transactional
    public void allocate(Long productId, Long shelfId, int quantity) {
        if (quantity <= 0) throw bad("Allocation quantity must be greater than zero");
        Product p = lockProduct(productId);
        WarehouseShelf shelf = lockShelf(shelfId);
        assertInvariant(p);
        if (p.getUnallocatedQuantity() < quantity) throw conflict("Insufficient unallocated stock");
        if ((long) shelf.getUsedCapacity() + quantity > shelf.getMaxCapacity()) throw conflict("Allocation exceeds shelf capacity");
        ShelfInventory allocation = allocations.findForUpdate(productId, shelfId).orElse(null);
        if (allocation == null) allocation = new ShelfInventory(p, shelf, 0);
        allocation.setQuantity(Math.addExact(allocation.getQuantity(), quantity));
        allocations.save(allocation);
        shelf.addUsage(quantity);
        p.setUnallocatedQuantity(p.getUnallocatedQuantity() - quantity);
        assertInvariant(p);
    }

    @Transactional(readOnly = true)
    public Page<TransactionView> history(Long productId, StockTransactionType type, LocalDate fromDate,
            LocalDate toDate, Pageable pageable) {
        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) throw bad("fromDate must be on or before toDate");
        Instant from = fromDate == null ? null : startOfReportingDate(fromDate);
        Instant toExclusive = toDate == null ? null : startOfReportingDate(toDate.plusDays(1));
        return transactions.search(productId, type, from, toExclusive, pageable).map(TransactionView::from);
    }

    @Transactional(readOnly = true)
    public List<ShelfInventoryView> shelfInventory(Long shelfId) {
        return allocations.findByShelfIdWithProductAndShelf(shelfId).stream().map(i -> {
            Product p = i.getProduct();
            return new ShelfInventoryView(p.getId(), p.getName(), p.getSku(), p.getCategory(), i.getQuantity(),
                    p.getUnallocatedQuantity(), p.getQuantity(), i.getShelf().getId(), i.getShelf().getRack().getId());
        }).toList();
    }

    private void ensureOpeningLocked(Product p, int quantity, Instant at, String actor) {
        if (transactions.existsByProduct_IdAndType(p.getId(), StockTransactionType.OPENING_STOCK)) return;
        long located = allocations.sumForProduct(p.getId());
        if (p.getQuantity() < 0) throw conflict("Existing product quantity is negative for " + p.getSku());
        if (located < 0 || allocations.existsByProduct_IdAndQuantityLessThan(p.getId(), 0)
                || located > p.getQuantity()) throw conflict("Existing shelf allocations are invalid for " + p.getSku());
        p.setUnallocatedQuantity(Math.toIntExact(p.getQuantity() - located));
        transactions.save(new StockTransaction(p, StockTransactionType.OPENING_STOCK, quantity, null, null,
                at, "INITIAL_BALANCE", "Opening quantity copied from product balance", actor));
    }

    private StockTransaction record(Product p, StockTransactionType type, int quantity, AdjustmentDirection direction,
            BigDecimal unitPrice, Instant at, String reference, String notes, String actor) {
        return transactions.save(new StockTransaction(p, type, quantity, direction, unitPrice, at, reference, notes, actor));
    }

    private Product lockProduct(Long id) {
        return products.findByIdForUpdate(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    }
    private WarehouseShelf lockShelf(Long id) {
        return shelves.findByIdForUpdate(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shelf not found"));
    }
    private void assertInvariant(Product p) {
        long sum = allocations.sumForProduct(p.getId()) + p.getUnallocatedQuantity();
        if (p.getUnallocatedQuantity() < 0 || allocations.existsByProduct_IdAndQuantityLessThan(p.getId(), 0)
                || sum != p.getQuantity()) throw conflict("Inventory allocation invariant is inconsistent for product " + p.getId());
    }
    Instant movementTime(Instant at) {
        Instant result = at == null ? Instant.now() : at;
        if (result.isBefore(OPENING_INSTANT)) throw bad("Stock movements cannot be backdated before 23 November 2026 (Asia/Kolkata)");
        return result;
    }
    private Instant movementTime(Instant at, Product product) {
        Instant result = at == null ? Instant.now() : at;
        Instant openingAt = transactions.findFirstByProduct_IdAndType(product.getId(), StockTransactionType.OPENING_STOCK)
                .map(StockTransaction::getEffectiveAt).orElse(OPENING_INSTANT);
        if (result.isBefore(openingAt)) throw bad("Stock movements cannot be backdated before the product's opening-stock date");
        return result;
    }
    private void validateStockAddedDate(LocalDate stockAddedDate) {
        if (stockAddedDate == null) throw bad("Stock Added Date is required");
        if (stockAddedDate.isAfter(LocalDate.now(REPORTING_ZONE))) throw bad("Stock Added Date cannot be in the future");
    }
    static Instant startOfReportingDate(LocalDate date) { return date.atStartOfDay(REPORTING_ZONE).toInstant(); }
    private ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private ResponseStatusException conflict(String message) { return new ResponseStatusException(HttpStatus.CONFLICT, message); }
}
