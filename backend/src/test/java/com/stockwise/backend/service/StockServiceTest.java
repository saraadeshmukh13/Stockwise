package com.stockwise.backend.service;

import com.stockwise.backend.dto.StockRequests.*;
import com.stockwise.backend.entity.*;
import com.stockwise.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.aop.framework.ProxyFactory;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StockServiceTest {
    @Mock ProductRepository products;
    @Mock StockTransactionRepository transactions;
    @Mock WarehouseShelfRepository shelves;
    @Mock ShelfInventoryRepository inventory;
    @Mock WarehouseRackRepository warehouseRacks;
    StockService service;
    Product product;
    WarehouseShelf shelf;
    WarehouseRack rack;

    @BeforeEach void setup() {
        service = new StockService(products, transactions, shelves, inventory, warehouseRacks);
        product = new Product(); product.setId(10L); product.setName("Widget"); product.setSku("W-10");
        product.setCategory("Electronics"); product.setQuantity(20); product.setUnallocatedQuantity(20);
        rack = new WarehouseRack("R-1", "Rack 1", null);
        setId(rack, 1L);
        shelf = new WarehouseShelf("S-1", rack, 100);
        setId(shelf, 3L);
    }
    private static void setId(Object instance, Long id) {
        try { var f=instance.getClass().getDeclaredField("id"); f.setAccessible(true); f.set(instance,id); }
        catch (ReflectiveOperationException e) { throw new AssertionError(e); }
    }
    private void lockedProduct() { when(products.findByIdForUpdate(10L)).thenReturn(Optional.of(product)); }
    private void lockedShelf() { when(shelves.findByIdForUpdate(3L)).thenReturn(Optional.of(shelf)); }
    private void invariant(long allocated) { when(inventory.sumForProduct(10L)).thenReturn(allocated); }

    @Test void openingInitializerPreservesQuantityAndIsIdempotentAcrossRuns() {
        AtomicReference<StockTransaction> opening = new AtomicReference<>();
        when(products.findAllForUpdateInIdOrder()).thenReturn(List.of(product));
        when(shelves.findAllForUpdateInIdOrder()).thenReturn(List.of(shelf));
        when(inventory.findByShelfIdForUpdate(3L)).thenReturn(List.of());
        when(transactions.findFirstByProduct_IdAndType(10L, StockTransactionType.OPENING_STOCK))
                .thenAnswer(i -> Optional.ofNullable(opening.get()));
        when(transactions.save(any(StockTransaction.class))).thenAnswer(i -> { opening.set(i.getArgument(0)); return i.getArgument(0); });

        service.initializeLegacyProducts();
        service.initializeLegacyProducts();

        assertEquals(20, product.getQuantity());
        assertEquals(20, product.getUnallocatedQuantity());
        assertEquals(StockService.OPENING_DATE, product.getStockAddedDate());
        assertEquals(0, shelf.getUsedCapacity());
        verify(transactions, times(1)).save(argThat(t -> t.getType() == StockTransactionType.OPENING_STOCK
                && t.getQuantity() == 20 && t.getEffectiveAt().equals(StockService.OPENING_INSTANT)));
    }

    @Test void initializerReconcilesExistingShelfAllocationsAndExistingOpeningRecord() {
        product.setUnallocatedQuantity(0);
        shelf.addUsage(2); // deliberately stale counter; initialization must replace it with persisted allocation total.
        StockTransaction opening = new StockTransaction(product, StockTransactionType.OPENING_STOCK, 20, null,
                null, StockService.OPENING_INSTANT, "INITIAL_BALANCE", "opening", null);
        ShelfInventory existingAllocation = new ShelfInventory(product, shelf, 6);
        when(products.findAllForUpdateInIdOrder()).thenReturn(List.of(product));
        when(shelves.findAllForUpdateInIdOrder()).thenReturn(List.of(shelf));
        when(inventory.findByShelfIdForUpdate(3L)).thenReturn(List.of(existingAllocation));
        when(transactions.findFirstByProduct_IdAndType(10L, StockTransactionType.OPENING_STOCK)).thenReturn(Optional.of(opening));

        service.initializeLegacyProducts();

        assertEquals(20, product.getQuantity());
        assertEquals(14, product.getUnallocatedQuantity());
        assertEquals(6, shelf.getUsedCapacity());
        verify(transactions, never()).save(any());
    }

    @Test void zeroQuantityProductGetsOneZeroOpeningRecord() {
        product.setQuantity(0); product.setUnallocatedQuantity(0);
        AtomicReference<StockTransaction> opening = new AtomicReference<>();
        when(products.findAllForUpdateInIdOrder()).thenReturn(List.of(product));
        when(shelves.findAllForUpdateInIdOrder()).thenReturn(List.of());
        when(transactions.findFirstByProduct_IdAndType(10L, StockTransactionType.OPENING_STOCK))
                .thenAnswer(i -> Optional.ofNullable(opening.get()));
        when(transactions.save(any())).thenAnswer(i -> { opening.set(i.getArgument(0)); return i.getArgument(0); });

        service.initializeLegacyProducts();

        assertNotNull(opening.get());
        assertEquals(0, opening.get().getQuantity());
        assertEquals(0, product.getUnallocatedQuantity());
    }

    @Test void initializerFailsBeforeOpeningRowsWhenShelfAllocationExceedsCapacity() {
        product = new Product();
        shelf = new WarehouseShelf("S-TINY", rack, 5);
        setId(shelf, 9L);
        when(products.findAllForUpdateInIdOrder()).thenReturn(List.of());
        when(shelves.findAllForUpdateInIdOrder()).thenReturn(List.of(shelf));
        when(inventory.findByShelfIdForUpdate(9L)).thenReturn(List.of(new ShelfInventory(product, shelf, 6)));

        IllegalStateException error = assertThrows(IllegalStateException.class, service::initializeLegacyProducts);

        assertTrue(error.getMessage().contains("S-TINY"));
        verify(transactions, never()).save(any());
    }

    @Test void openingTransactionHasDatabaseUniqueNullableKey() throws Exception {
        var field = StockTransaction.class.getDeclaredField("openingStockProductId");
        assertTrue(field.isAnnotationPresent(jakarta.persistence.Column.class));
        assertTrue(field.getAnnotation(jakarta.persistence.Column.class).unique());
        var check = StockTransaction.class.getAnnotation(org.hibernate.annotations.Check.class);
        assertNotNull(check);
        assertTrue(check.constraints().contains("opening_stock_product_id = product_id"));
    }

    @Test void openingKeyIsPopulatedAndValidatedAgainstItsProduct() throws Exception {
        var opening = new StockTransaction(product, StockTransactionType.OPENING_STOCK, 20, null,
                null, StockService.OPENING_INSTANT, null, null, null);
        assertEquals(product.getId(), opening.getOpeningStockProductId());
        var validator = StockTransaction.class.getDeclaredMethod("validateOpeningStockKey");
        validator.setAccessible(true);
        validator.invoke(opening);

        var key = StockTransaction.class.getDeclaredField("openingStockProductId");
        key.setAccessible(true);
        key.set(opening, 999L);
        var invalidKey = assertThrows(java.lang.reflect.InvocationTargetException.class, () -> validator.invoke(opening));
        assertInstanceOf(IllegalStateException.class, invalidKey.getCause());
    }

    @Test void openingDateUsesAsiaKolkataMidnightAndMovementDateCannotPrecedeIt() {
        assertEquals(Instant.parse("2026-11-22T18:30:00Z"), StockService.OPENING_INSTANT);
        assertEquals(Instant.parse("2026-11-22T18:30:00Z"), StockService.startOfReportingDate(LocalDate.of(2026,11,23)));
        assertEquals(Instant.parse("2026-11-23T18:30:00Z"), StockService.startOfReportingDate(LocalDate.of(2026,11,24)));
        assertThrows(ResponseStatusException.class, () -> service.movementTime(Instant.parse("2026-11-22T18:29:59Z")));
        assertEquals(StockService.OPENING_INSTANT, service.movementTime(StockService.OPENING_INSTANT));
    }

    @Test void transactionAndShelfInventoryViewsAreMappedInsideTransactionalServices() throws Exception {
        var historyMethod = StockService.class.getMethod("history", Long.class, StockTransactionType.class,
                LocalDate.class, LocalDate.class, org.springframework.data.domain.Pageable.class);
        var shelfMethod = StockService.class.getMethod("shelfInventory", Long.class);
        assertTrue(historyMethod.isAnnotationPresent(org.springframework.transaction.annotation.Transactional.class));
        assertTrue(shelfMethod.isAnnotationPresent(org.springframework.transaction.annotation.Transactional.class));
        assertEquals(com.stockwise.backend.dto.StockViews.TransactionView.class,
                ((java.lang.reflect.ParameterizedType) historyMethod.getGenericReturnType()).getActualTypeArguments()[0]);
        assertEquals(com.stockwise.backend.dto.StockViews.ShelfInventoryView.class,
                ((java.lang.reflect.ParameterizedType) shelfMethod.getGenericReturnType()).getActualTypeArguments()[0]);

        StockTransaction tx = new StockTransaction(product, StockTransactionType.PURCHASE, 2, null,
                BigDecimal.ONE, StockService.OPENING_INSTANT, "PO-X", null, "buyer");
        setId(tx, 55L);
        when(transactions.search(isNull(), isNull(), any(), any(), any()))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(tx)));
        var page = service.history(null, null, LocalDate.of(2026,11,23), LocalDate.of(2026,11,23),
                org.springframework.data.domain.PageRequest.of(0, 10));
        assertEquals(10L, page.getContent().getFirst().productId());
        assertEquals(StockService.OPENING_INSTANT, page.getContent().getFirst().effectiveAt());
        verify(transactions).search(isNull(), isNull(), eq(StockService.OPENING_INSTANT),
                eq(Instant.parse("2026-11-23T18:30:00Z")), any());

        when(inventory.findByShelfIdWithProductAndShelf(3L)).thenReturn(List.of(new ShelfInventory(product, shelf, 4)));
        var shelfViews = service.shelfInventory(3L);
        assertEquals(1, shelfViews.size());
        assertEquals(4, shelfViews.getFirst().quantity());
        assertEquals("Electronics", shelfViews.getFirst().category());
        assertEquals(3L, shelfViews.getFirst().shelfId());
        assertEquals(1L, shelfViews.getFirst().rackId());
    }

    @Test void purchaseUpdatesProductShelfAndLedgerTogether() {
        lockedProduct(); lockedShelf();
        when(inventory.sumForProduct(10L)).thenReturn(0L, 5L);
        when(inventory.findForUpdate(10L,3L)).thenReturn(Optional.empty());
        when(transactions.save(any())).thenAnswer(i -> i.getArgument(0));
        var request = new PurchaseRequest(10L, 5, new BigDecimal("4.25"), 3L, "PO-1", null, null);

        var saved = service.purchase(request, "buyer");

        assertEquals(25, product.getQuantity());
        assertEquals(20, product.getUnallocatedQuantity());
        assertEquals(5, shelf.getUsedCapacity());
        verify(inventory).save(argThat(i -> i.getQuantity() == 5));
        assertEquals(StockTransactionType.PURCHASE, saved.type());
        assertEquals("buyer", saved.actorUsername());
    }

    @Test void saleRejectsInsufficientShelfAndDoesNotPersistPartialMovement() {
        product.setUnallocatedQuantity(18); lockedProduct(); lockedShelf(); invariant(2);
        ShelfInventory allocation = new ShelfInventory(product, shelf, 2);
        when(inventory.findForUpdate(10L,3L)).thenReturn(Optional.of(allocation));
        var request = new SaleRequest(10L, 3, BigDecimal.ONE, 3L, "SO-1", null, null);

        assertThrows(ResponseStatusException.class, () -> service.sale(request, "clerk"));
        assertEquals(20, product.getQuantity());
        assertEquals(2, allocation.getQuantity());
        verify(inventory, never()).save(any());
        verify(transactions, never()).save(any());
    }

    @Test void saleConsumesShelfQuantityAndKeepsUnallocatedBalance() {
        product.setUnallocatedQuantity(5); lockedProduct(); lockedShelf();
        when(inventory.sumForProduct(10L)).thenReturn(15L, 11L);
        ShelfInventory allocation = new ShelfInventory(product, shelf, 15);
        shelf.addUsage(15);
        when(inventory.findForUpdate(10L,3L)).thenReturn(Optional.of(allocation));
        when(transactions.save(any())).thenAnswer(i -> i.getArgument(0));
        var saved = service.sale(new SaleRequest(10L, 4, BigDecimal.TEN, 3L, "SO-2", null, null), "clerk");

        assertEquals(16, product.getQuantity());
        assertEquals(11, allocation.getQuantity());
        assertEquals(11, shelf.getUsedCapacity());
        assertEquals(StockTransactionType.SALE, saved.type());
        verify(inventory).save(argThat(i -> i.getQuantity() == 11));
    }

    @Test void adjustmentIncreaseAndDecreaseAreSignedByDirectionAndReasonIsRecorded() {
        lockedProduct(); invariant(0);
        when(transactions.save(any())).thenAnswer(i -> i.getArgument(0));
        var increase = service.adjust(new AdjustmentRequest(10L, AdjustmentDirection.INCREASE, 3, "Count correction", null, null), "admin");
        assertEquals(23, product.getQuantity());
        assertEquals(23, product.getUnallocatedQuantity());
        assertEquals(AdjustmentDirection.INCREASE, increase.direction());
        assertEquals("Count correction", increase.notes());

        invariant(0);
        var decrease = service.adjust(new AdjustmentRequest(10L, AdjustmentDirection.DECREASE, 2, "Damaged units", null, null), "admin");
        assertEquals(21, product.getQuantity());
        assertEquals(21, product.getUnallocatedQuantity());
        assertEquals(AdjustmentDirection.DECREASE, decrease.direction());
    }

    @Test void adjustmentCannotMakeStockNegative() {
        product.setQuantity(2); product.setUnallocatedQuantity(2); lockedProduct(); invariant(0);
        assertThrows(ResponseStatusException.class, () -> service.adjust(
                new AdjustmentRequest(10L, AdjustmentDirection.DECREASE, 3, "Correction", null, null), "admin"));
        verify(transactions, never()).save(any());
        assertEquals(2, product.getQuantity());
    }

    @Test void purchaseCapacityFailureLeavesAllQuantitiesAndLedgerUntouched() {
        lockedProduct(); lockedShelf(); invariant(0);
        shelf.addUsage(99);
        assertThrows(ResponseStatusException.class, () -> service.purchase(
                new PurchaseRequest(10L, 2, BigDecimal.ONE, 3L, "PO-2", null, null), "buyer"));
        verify(inventory, never()).save(any());
        verify(transactions, never()).save(any());
        assertEquals(20, product.getQuantity());
    }

    @Test void newProductInitialQuantityAndOpeningRecordAreCreatedTogether() {
        Product newProduct = new Product(); newProduct.setName("New"); newProduct.setSku("NEW-1");
        newProduct.setQuantity(6);
        newProduct.setStockAddedDate(LocalDate.of(2026, 11, 18));
        when(products.save(any(Product.class))).thenAnswer(i -> {
            Product p=i.getArgument(0); p.setId(30L); return p;
        });
        when(transactions.existsByProduct_IdAndType(30L, StockTransactionType.OPENING_STOCK)).thenReturn(false);
        when(transactions.save(any())).thenAnswer(i -> i.getArgument(0));

        Product saved = service.createProduct(newProduct, "admin");

        assertEquals(6, saved.getQuantity());
        assertEquals(6, saved.getUnallocatedQuantity());
        assertEquals(LocalDate.of(2026, 11, 18), saved.getStockAddedDate());
        verify(transactions).save(argThat(t -> t.getProduct().getId().equals(30L)
                && t.getType() == StockTransactionType.OPENING_STOCK && t.getQuantity() == 6
                && t.getEffectiveAt().equals(StockService.startOfReportingDate(LocalDate.of(2026, 11, 18)))
                && "admin".equals(t.getActorUsername())));
    }

    @Test void newProductRequiresAValidNonFutureOpeningDate() {
        Product missingDate = new Product();
        missingDate.setName("No Date"); missingDate.setSku("NO-DATE"); missingDate.setQuantity(0);
        assertThrows(ResponseStatusException.class, () -> service.createProduct(missingDate, "admin"));
        verify(products, never()).save(any());

        Product futureDate = new Product();
        futureDate.setName("Future"); futureDate.setSku("FUTURE"); futureDate.setQuantity(0);
        futureDate.setStockAddedDate(LocalDate.now(StockService.REPORTING_ZONE).plusDays(1));
        assertThrows(ResponseStatusException.class, () -> service.createProduct(futureDate, "admin"));
        verify(products, never()).save(any());
    }

    @Test void ledgerWriteFailureTriggersSpringTransactionRollback() {
        lockedProduct(); lockedShelf(); invariant(0);
        when(inventory.findForUpdate(10L,3L)).thenReturn(Optional.empty());
        when(transactions.save(any())).thenThrow(new IllegalStateException("ledger unavailable"));
        CountingTransactionManager txManager = new CountingTransactionManager();
        ProxyFactory factory = new ProxyFactory(service);
        factory.addAdvice(new TransactionInterceptor(txManager, new AnnotationTransactionAttributeSource()));
        StockService transactional = (StockService) factory.getProxy();

        assertThrows(IllegalStateException.class, () -> transactional.purchase(
                new PurchaseRequest(10L, 2, BigDecimal.ONE, 3L, "PO-ROLLBACK", null, null), "buyer"));
        assertEquals(1, txManager.rollbacks);
        assertEquals(0, txManager.commits);
    }

    @Test void allocationMovesStockFromUnallocatedAndEnforcesShelfCapacity() {
        lockedProduct(); lockedShelf();
        when(inventory.sumForProduct(10L)).thenReturn(0L, 7L);
        when(inventory.findForUpdate(10L,3L)).thenReturn(Optional.empty());
        service.allocate(10L, 3L, 7);
        assertEquals(13, product.getUnallocatedQuantity());
        assertEquals(7, shelf.getUsedCapacity());
        verify(inventory).save(argThat(i -> i.getQuantity() == 7));

        invariant(7);
        shelf.addUsage(92);
        assertThrows(ResponseStatusException.class, () -> service.allocate(10L, 3L, 2));
        assertEquals(13, product.getUnallocatedQuantity());
    }

    @Test void stockOperationsUsePessimisticProductAndShelfLockRepositories() throws Exception {
        assertTrue(ProductRepository.class.getMethod("findByIdForUpdate", Long.class)
                .isAnnotationPresent(org.springframework.data.jpa.repository.Lock.class));
        assertTrue(WarehouseShelfRepository.class.getMethod("findByIdForUpdate", Long.class)
                .isAnnotationPresent(org.springframework.data.jpa.repository.Lock.class));
        assertTrue(ShelfInventoryRepository.class.getMethod("findForUpdate", Long.class, Long.class)
                .isAnnotationPresent(org.springframework.data.jpa.repository.Lock.class));
    }

    static class CountingTransactionManager extends AbstractPlatformTransactionManager {
        int commits;
        int rollbacks;
        @Override protected Object doGetTransaction() { return new Object(); }
        @Override protected boolean isExistingTransaction(Object transaction) { return false; }
        @Override protected void doBegin(Object transaction, TransactionDefinition definition) {}
        @Override protected void doCommit(DefaultTransactionStatus status) { commits++; }
        @Override protected void doRollback(DefaultTransactionStatus status) { rollbacks++; }
    }
}
