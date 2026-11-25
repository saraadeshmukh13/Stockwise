package com.stockwise.backend.service;

import com.stockwise.backend.controller.StockController;
import com.stockwise.backend.dto.MonthlyStockReportViews.CoverageStatus;
import com.stockwise.backend.entity.AdjustmentDirection;
import com.stockwise.backend.entity.Product;
import com.stockwise.backend.entity.StockTransaction;
import com.stockwise.backend.entity.StockTransactionType;
import com.stockwise.backend.repository.ProductRepository;
import com.stockwise.backend.repository.StockTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MonthlyStockReportServiceTest {
    private static final Instant AS_OF = Instant.parse("2026-11-24T12:00:00Z");
    private StockTransactionRepository transactions;
    private ProductRepository products;

    @BeforeEach
    void setUp() {
        transactions = mock(StockTransactionRepository.class);
        products = mock(ProductRepository.class);
        when(products.findAll()).thenReturn(List.of());
        when(transactions.findByEffectiveAtGreaterThanEqualAndEffectiveAtLessThanOrderByEffectiveAtAscIdAsc(
                any(), any())).thenReturn(List.of());
    }

    @Test
    void marksRepositoryConstructorForSpringInjection() throws Exception {
        var constructor = MonthlyStockReportService.class.getConstructor(
                StockTransactionRepository.class, ProductRepository.class);

        assertTrue(constructor.isAnnotationPresent(Autowired.class));
    }

    @Test
    void returnsAprilThroughNovemberAndMarksUnavailableHistoricalMonthsWithNullTotals() {
        MonthlyStockReportService service = service(Instant.parse("2026-11-22T12:00:00Z"));

        var report = service.monthlyReport();

        assertEquals(8, report.months().size());
        for (int i = 0; i < 7; i++) {
            var month = report.months().get(i);
            assertEquals(i + 4, month.month());
            assertEquals(CoverageStatus.NO_HISTORICAL_TRANSACTION_DATA, month.status());
            assertNull(month.openingStock());
            assertNull(month.purchasedQuantity());
            assertNull(month.soldQuantity());
            assertNull(month.adjustmentQuantity());
            assertNull(month.closingStock());
            assertTrue(month.products().isEmpty());
        }
        var november = report.months().get(7);
        assertEquals(11, november.month());
        assertEquals(CoverageStatus.NO_HISTORICAL_TRANSACTION_DATA, november.status());
        assertNull(november.coverageEnd());
        verify(transactions, never()).findByEffectiveAtGreaterThanEqualAndEffectiveAtLessThanOrderByEffectiveAtAscIdAsc(
                any(), any());
    }

    @Test
    void calculatesNovemberMovementsFromOpeningTransactionWithoutUsingCurrentProductQuantity() {
        Product product = product(7L, 999, 46, 6);
        when(products.findAll()).thenReturn(List.of(product));
        when(transactions.findByEffectiveAtGreaterThanEqualAndEffectiveAtLessThanOrderByEffectiveAtAscIdAsc(
                any(), any())).thenReturn(List.of(
                transaction(1L, product, StockTransactionType.OPENING_STOCK, 42, null,
                        StockService.OPENING_INSTANT),
                transaction(2L, product, StockTransactionType.PURCHASE, 10, null,
                        Instant.parse("2026-11-23T12:00:00Z")),
                transaction(3L, product, StockTransactionType.SALE, 8, null,
                        Instant.parse("2026-11-24T08:00:00Z")),
                transaction(4L, product, StockTransactionType.ADJUSTMENT, 3, AdjustmentDirection.INCREASE,
                        Instant.parse("2026-11-24T09:00:00Z")),
                transaction(5L, product, StockTransactionType.ADJUSTMENT, 2, AdjustmentDirection.DECREASE,
                        Instant.parse("2026-11-24T10:00:00Z"))));

        var november = service(AS_OF).monthlyReport().months().get(7);

        assertEquals(42L, november.openingStock());
        assertTrue(november.openingStockComplete());
        assertEquals(0L, november.subsequentOpeningStock());
        assertEquals(10L, november.purchasedQuantity());
        assertEquals(8L, november.soldQuantity());
        assertEquals(3L, november.adjustmentIncrease());
        assertEquals(2L, november.adjustmentDecrease());
        assertEquals(5L, november.adjustmentQuantity());
        assertEquals(45L, november.closingStock());
        assertTrue(november.closingStockComplete());
        assertEquals(1L, november.restockSuggestionCount());
        var productReport = november.products().getFirst();
        assertEquals(42L, productReport.openingStock());
        assertEquals(45L, productReport.closingStock());
        assertTrue(productReport.restockSuggested());
        assertEquals(7.5, productReport.estimatedDaysRemaining());
        verify(transactions).findByEffectiveAtGreaterThanEqualAndEffectiveAtLessThanOrderByEffectiveAtAscIdAsc(
                eq(LocalDate.of(2026, 4, 1).atStartOfDay(StockService.REPORTING_ZONE).toInstant()),
                eq(AS_OF.plusNanos(1)));
    }

    @Test
    void keepsLaterProductOpeningSeparateAndUsesItOnlyForSupportedClosingBalance() {
        Product product = product(8L, 10, 12, 2);
        Instant created = Instant.parse("2026-11-24T08:00:00Z");
        when(products.findAll()).thenReturn(List.of(product));
        when(transactions.findByEffectiveAtGreaterThanEqualAndEffectiveAtLessThanOrderByEffectiveAtAscIdAsc(
                any(), any())).thenReturn(List.of(
                transaction(11L, product, StockTransactionType.OPENING_STOCK, 7, null, created),
                transaction(12L, product, StockTransactionType.PURCHASE, 3, null,
                        Instant.parse("2026-11-24T09:00:00Z"))));

        var november = service(AS_OF).monthlyReport().months().get(7);

        assertEquals(0L, november.openingStock());
        assertTrue(november.openingStockComplete());
        assertEquals(7L, november.subsequentOpeningStock());
        assertEquals(3L, november.purchasedQuantity());
        assertEquals(10L, november.closingStock());
        assertEquals(7L, november.products().getFirst().subsequentOpeningStock());
        assertNull(november.products().getFirst().openingStock());
    }

    @Test
    void reportsSelectedInitialStockMonthAsOpeningAndDoesNotInventEarlierHistory() {
        Product product = product(13L, 15, 5, 1);
        product.setStockAddedDate(java.time.LocalDate.of(2026, 4, 1));
        when(products.findAll()).thenReturn(List.of(product));
        when(transactions.findByEffectiveAtGreaterThanEqualAndEffectiveAtLessThanOrderByEffectiveAtAscIdAsc(
                any(), any())).thenReturn(List.of(
                transaction(31L, product, StockTransactionType.OPENING_STOCK, 12, null,
                        java.time.LocalDate.of(2026, 4, 1).atStartOfDay(StockService.REPORTING_ZONE).toInstant()),
                transaction(32L, product, StockTransactionType.PURCHASE, 5, null,
                        Instant.parse("2026-04-15T08:00:00Z"))));

        var selectedReport = service(AS_OF).monthlyReport(2026, 4);
        var april = selectedReport.months().getFirst();

        assertEquals(2026, selectedReport.year());
        assertEquals(1, selectedReport.months().size());
        assertEquals(CoverageStatus.PARTIAL_FROM_OPENING_DATE, april.status());
        assertEquals(java.time.LocalDate.of(2026, 4, 1), april.coverageStart());
        assertEquals(12L, april.openingStock());
        assertEquals(5L, april.purchasedQuantity());
        assertEquals(0L, april.soldQuantity());
        assertEquals(17L, april.closingStock());
        verify(transactions).findByEffectiveAtGreaterThanEqualAndEffectiveAtLessThanOrderByEffectiveAtAscIdAsc(
                eq(java.time.LocalDate.of(2026, 4, 1).atStartOfDay(StockService.REPORTING_ZONE).toInstant()),
                eq(java.time.LocalDate.of(2026, 5, 1).atStartOfDay(StockService.REPORTING_ZONE).toInstant()));
    }

    @Test
    void selectedMonthUsesAsiaKolkataBoundariesAndReturnsOnlyThatMonth() {
        Product product = product(14L, 14, 2, 1);
        product.setStockAddedDate(LocalDate.of(2026, 4, 1));
        Instant aprilEnd = Instant.parse("2026-04-30T18:29:59Z");
        Instant mayStart = Instant.parse("2026-04-30T18:30:00Z");
        when(products.findAll()).thenReturn(List.of(product));
        when(transactions.findByEffectiveAtGreaterThanEqualAndEffectiveAtLessThanOrderByEffectiveAtAscIdAsc(
                any(), any())).thenReturn(List.of(
                transaction(41L, product, StockTransactionType.OPENING_STOCK, 10, null,
                        LocalDate.of(2026, 4, 1).atStartOfDay(StockService.REPORTING_ZONE).toInstant()),
                transaction(42L, product, StockTransactionType.PURCHASE, 5, null, aprilEnd),
                transaction(43L, product, StockTransactionType.SALE, 3, null, mayStart)));

        var report = service(AS_OF).monthlyReport(2026, 4);
        var april = report.months().getFirst();

        assertEquals(1, report.months().size());
        assertEquals(4, april.month());
        assertEquals(5L, april.purchasedQuantity());
        assertEquals(0L, april.soldQuantity());
        assertEquals(15L, april.closingStock());
        verify(transactions).findByEffectiveAtGreaterThanEqualAndEffectiveAtLessThanOrderByEffectiveAtAscIdAsc(
                eq(LocalDate.of(2026, 4, 1).atStartOfDay(StockService.REPORTING_ZONE).toInstant()),
                eq(LocalDate.of(2026, 5, 1).atStartOfDay(StockService.REPORTING_ZONE).toInstant()));
    }

    @Test
    void unknownAdjustmentDirectionKeepsMovementVisibleButMakesClosingUnavailable() {
        Product product = product(9L, 12, 10, 2);
        when(products.findAll()).thenReturn(List.of(product));
        when(transactions.findByEffectiveAtGreaterThanEqualAndEffectiveAtLessThanOrderByEffectiveAtAscIdAsc(
                any(), any())).thenReturn(List.of(
                transaction(21L, product, StockTransactionType.OPENING_STOCK, 10, null,
                        StockService.OPENING_INSTANT),
                transaction(22L, product, StockTransactionType.ADJUSTMENT, 2, null,
                        Instant.parse("2026-11-24T08:00:00Z"))));

        var november = service(AS_OF).monthlyReport().months().get(7);

        assertEquals(2L, november.adjustmentQuantity());
        assertNull(november.adjustmentIncrease());
        assertNull(november.adjustmentDecrease());
        assertNull(november.closingStock());
        assertFalse(november.closingStockComplete());
        assertFalse(november.restockSuggestionsAvailable());
        assertNull(november.products().getFirst().adjustmentIncrease());
        assertNull(november.products().getFirst().adjustmentDecrease());
        assertNull(november.products().getFirst().restockSuggested());
    }

    @Test
    void controllerExposesTheMonthlyReportRoute() throws Exception {
        GetMapping mapping = StockController.class.getMethod("monthlyReport", Integer.class, Integer.class)
                .getAnnotation(GetMapping.class);
        assertNotNull(mapping);
        assertArrayEquals(new String[]{"/reports/monthly"}, mapping.value());
    }

    private MonthlyStockReportService service(Instant asOf) {
        return new MonthlyStockReportService(transactions, products,
                Clock.fixed(asOf, ZoneOffset.UTC));
    }

    private Product product(Long id, int currentQuantity, int reorderLevel, int dailyDemand) {
        Product product = new Product();
        product.setId(id);
        product.setName("Product " + id);
        product.setSku("SKU-" + id);
        product.setQuantity(currentQuantity);
        product.setStockAddedDate(java.time.LocalDate.of(2026, 11, 1));
        product.setReorderLevel(reorderLevel);
        product.setDailyDemand(dailyDemand);
        return product;
    }

    private StockTransaction transaction(Long id, Product product, StockTransactionType type, int quantity,
                                         AdjustmentDirection direction, Instant effectiveAt) {
        StockTransaction transaction = new StockTransaction(product, type, quantity, direction,
                null, effectiveAt, null, null, null);
        try {
            var idField = StockTransaction.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(transaction, id);
        } catch (ReflectiveOperationException exception) {
            throw new AssertionError(exception);
        }
        return transaction;
    }
}
