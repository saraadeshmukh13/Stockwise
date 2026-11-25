package com.stockwise.backend.service;

import com.stockwise.backend.dto.MonthlyStockReportViews.CoverageStatus;
import com.stockwise.backend.dto.MonthlyStockReportViews.Month;
import com.stockwise.backend.dto.MonthlyStockReportViews.ProductMonth;
import com.stockwise.backend.dto.MonthlyStockReportViews.Report;
import com.stockwise.backend.entity.AdjustmentDirection;
import com.stockwise.backend.entity.Product;
import com.stockwise.backend.entity.StockTransaction;
import com.stockwise.backend.entity.StockTransactionType;
import com.stockwise.backend.repository.ProductRepository;
import com.stockwise.backend.repository.StockTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class MonthlyStockReportService {
    private static final ZoneId REPORTING_ZONE = StockService.REPORTING_ZONE;
    private final StockTransactionRepository transactions;
    private final ProductRepository products;
    private final Clock clock;

    @Autowired
    public MonthlyStockReportService(StockTransactionRepository transactions, ProductRepository products) {
        this(transactions, products, Clock.systemUTC());
    }

    MonthlyStockReportService(StockTransactionRepository transactions, ProductRepository products, Clock clock) {
        this.transactions = transactions;
        this.products = products;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Report monthlyReport() {
        return buildReport(2026, java.util.stream.IntStream.rangeClosed(4, 11).boxed().toList());
    }

    @Transactional(readOnly = true)
    public Report monthlyReport(int year, int month) {
        return buildReport(year, List.of(month));
    }

    private Report buildReport(int year, List<Integer> monthsToReport) {
        Instant now = clock.instant();
        LocalDate generatedThrough = LocalDate.ofInstant(now, REPORTING_ZONE);
        LocalDate firstMonth = LocalDate.of(year, monthsToReport.getFirst(), 1);
        LocalDate afterLastMonth = LocalDate.of(year, monthsToReport.getLast(), 1).plusMonths(1);
        Instant requestedEnd = afterLastMonth.atStartOfDay(REPORTING_ZONE).toInstant();
        Instant queryEnd = now.isBefore(requestedEnd) ? now.plusNanos(1) : requestedEnd;
        List<Product> productList = products.findAll();

        LocalDate earliestOpeningDate = productList.stream()
                .map(Product::getStockAddedDate)
                .filter(date -> date != null)
                .min(Comparator.naturalOrder())
                .orElse(firstMonth);
        LocalDate queryStartDate = earliestOpeningDate.isBefore(firstMonth) ? earliestOpeningDate : firstMonth;
        Instant queryStart = queryStartDate.atStartOfDay(REPORTING_ZONE).toInstant();
        List<StockTransaction> ledger = !productList.isEmpty() && queryEnd.isAfter(queryStart)
                ? transactions.findByEffectiveAtGreaterThanEqualAndEffectiveAtLessThanOrderByEffectiveAtAscIdAsc(
                        queryStart, queryEnd)
                : List.of();

        Map<Long, List<StockTransaction>> byProduct = new HashMap<>();
        for (StockTransaction transaction : ledger) {
            if (transaction.getProduct() != null && transaction.getProduct().getId() != null) {
                byProduct.computeIfAbsent(transaction.getProduct().getId(), ignored -> new ArrayList<>()).add(transaction);
            }
        }

        List<Month> months = new ArrayList<>(monthsToReport.size());
        for (int month : monthsToReport) {
            months.add(reportMonth(year, month, queryEnd, productList, byProduct));
        }
        return new Report(year, REPORTING_ZONE.getId(), generatedThrough, List.copyOf(months));
    }

    private Month reportMonth(int year, int monthNumber, Instant queryEnd, List<Product> productList,
                              Map<Long, List<StockTransaction>> byProduct) {
        if (year != 2026 || monthNumber < 4 || monthNumber > 11) {
            String name = java.time.Month.of(monthNumber).getDisplayName(TextStyle.FULL, Locale.ENGLISH);
            return noHistoryMonth(monthNumber, name);
        }
        LocalDate monthStartDate = LocalDate.of(year, monthNumber, 1);
        LocalDate nextMonthDate = monthStartDate.plusMonths(1);
        Instant monthStart = monthStartDate.atStartOfDay(REPORTING_ZONE).toInstant();
        Instant monthEnd = nextMonthDate.atStartOfDay(REPORTING_ZONE).toInstant();
        Instant periodEnd = queryEnd.isBefore(monthEnd) ? queryEnd : monthEnd;
        String monthName = java.time.Month.of(monthNumber).getDisplayName(TextStyle.FULL, Locale.ENGLISH);
        if (!periodEnd.isAfter(monthStart)) return noHistoryMonth(monthNumber, monthName);

        List<ProductMonth> productReports = new ArrayList<>();
        long openingTotal = 0;
        long subsequentOpeningTotal = 0;
        long purchasedTotal = 0;
        long soldTotal = 0;
        long adjustmentIncreaseTotal = 0;
        long adjustmentDecreaseTotal = 0;
        long adjustmentQuantityTotal = 0;
        long closingTotal = 0;
        int closingCount = 0;
        int restockCount = 0;
        boolean reportTotalsComplete = true;
        boolean openingTotalComplete = true;
        boolean directionsKnownOverall = true;
        LocalDate coverageStart = null;

        for (Product product : productList) {
            List<StockTransaction> history = byProduct.getOrDefault(product.getId(), List.of());
            StockTransaction opening = history.stream()
                    .filter(tx -> tx.getType() == StockTransactionType.OPENING_STOCK)
                    .min(Comparator.comparing(StockTransaction::getEffectiveAt))
                    .orElse(null);

            if (opening == null) {
                LocalDate stockMonth = product.getStockAddedDate();
                boolean shouldExistByPeriodEnd = stockMonth == null
                        || !stockMonth.atStartOfDay(REPORTING_ZONE).toInstant().isAfter(periodEnd);
                if (shouldExistByPeriodEnd) {
                    reportTotalsComplete = false;
                    openingTotalComplete = false;
                }
                continue;
            }
            Instant openingAt = opening.getEffectiveAt();
            if (!openingAt.isBefore(periodEnd)) continue;

            LocalDate openingDate = LocalDate.ofInstant(openingAt, REPORTING_ZONE);
            LocalDate productCoverageStart = openingAt.isBefore(monthStart) ? monthStartDate : openingDate;
            if (coverageStart == null || productCoverageStart.isBefore(coverageStart)) coverageStart = productCoverageStart;

            // The Nov 23 system opening is the explicit November reporting baseline, although
            // it falls after the calendar month's first day. Other in-month openings are additions.
            boolean openingIsMonthBaseline = !openingAt.isAfter(monthStart)
                    || openingAt.equals(StockService.OPENING_INSTANT);
            long productOpening = openingIsMonthBaseline ? opening.getQuantity() : 0;
            long productAddedThisMonth = openingIsMonthBaseline ? 0 : opening.getQuantity();
            boolean productOpeningKnown = openingIsMonthBaseline;
            if (openingIsMonthBaseline && openingAt.isBefore(monthStart)) {
                for (StockTransaction tx : history) {
                    if (isMovementAfterOpening(tx, opening) && tx.getEffectiveAt().isBefore(monthStart)) {
                        if (tx.getType() == StockTransactionType.ADJUSTMENT
                                && tx.getAdjustmentDirection() == null) {
                            productOpeningKnown = false;
                        } else if (productOpeningKnown) {
                            productOpening = applyMovement(productOpening, tx);
                        }
                    }
                }
            }

            long purchased = 0;
            long sold = 0;
            long adjustmentIncrease = 0;
            long adjustmentDecrease = 0;
            long adjustmentQuantity = 0;
            boolean directionsKnown = true;
            long netMovements = 0;
            for (StockTransaction tx : history) {
                if (!isMovementAfterOpening(tx, opening)
                        || tx.getEffectiveAt().isBefore(monthStart)
                        || !tx.getEffectiveAt().isBefore(periodEnd)) continue;
                switch (tx.getType()) {
                    case OPENING_STOCK -> { /* the baseline is reported separately */ }
                    case PURCHASE -> {
                        purchased = Math.addExact(purchased, tx.getQuantity());
                        netMovements = Math.addExact(netMovements, tx.getQuantity());
                    }
                    case SALE -> {
                        sold = Math.addExact(sold, tx.getQuantity());
                        netMovements = Math.subtractExact(netMovements, tx.getQuantity());
                    }
                    case ADJUSTMENT -> {
                        adjustmentQuantity = Math.addExact(adjustmentQuantity, tx.getQuantity());
                        if (tx.getAdjustmentDirection() == AdjustmentDirection.INCREASE) {
                            adjustmentIncrease = Math.addExact(adjustmentIncrease, tx.getQuantity());
                            netMovements = Math.addExact(netMovements, tx.getQuantity());
                        } else if (tx.getAdjustmentDirection() == AdjustmentDirection.DECREASE) {
                            adjustmentDecrease = Math.addExact(adjustmentDecrease, tx.getQuantity());
                            netMovements = Math.subtractExact(netMovements, tx.getQuantity());
                        } else {
                            directionsKnown = false;
                        }
                    }
                }
            }

            Long closing = directionsKnown
                    ? Math.addExact(productOpeningKnown ? productOpening : productAddedThisMonth, netMovements) : null;
            Boolean restockSuggested = closing == null ? null : closing <= product.getReorderLevel();
            Double daysRemaining = closing == null || product.getDailyDemand() <= 0
                    ? null : (double) closing / product.getDailyDemand();
            productReports.add(new ProductMonth(product.getId(), product.getName(), product.getSku(),
                    product.getReorderLevel(), product.getDailyDemand(), productOpeningKnown ? productOpening : null,
                    productAddedThisMonth, purchased, sold, directionsKnown ? adjustmentIncrease : null,
                    directionsKnown ? adjustmentDecrease : null, adjustmentQuantity,
                    closing, restockSuggested, daysRemaining));

            if (productOpeningKnown) openingTotal = Math.addExact(openingTotal, productOpening);
            else if (productAddedThisMonth == 0) openingTotalComplete = false;
            subsequentOpeningTotal = Math.addExact(subsequentOpeningTotal, productAddedThisMonth);
            if (directionsKnown) {
                adjustmentIncreaseTotal = Math.addExact(adjustmentIncreaseTotal, adjustmentIncrease);
                adjustmentDecreaseTotal = Math.addExact(adjustmentDecreaseTotal, adjustmentDecrease);
            } else {
                directionsKnownOverall = false;
            }
            adjustmentQuantityTotal = Math.addExact(adjustmentQuantityTotal, adjustmentQuantity);
            purchasedTotal = Math.addExact(purchasedTotal, purchased);
            soldTotal = Math.addExact(soldTotal, sold);
            if (closing != null) {
                closingTotal = Math.addExact(closingTotal, closing);
                closingCount++;
                if (Boolean.TRUE.equals(restockSuggested)) restockCount++;
            }
        }

        if (productReports.isEmpty()) return noHistoryMonth(monthNumber, monthName);
        boolean closingComplete = reportTotalsComplete && closingCount == productReports.size();
        boolean openingComplete = reportTotalsComplete && openingTotalComplete;
        LocalDate coverageEnd = LocalDate.ofInstant(periodEnd.minusNanos(1), REPORTING_ZONE);
        return new Month(monthNumber, monthName, CoverageStatus.PARTIAL_FROM_OPENING_DATE,
                coverageStart, coverageEnd,
                openingTotalComplete ? openingTotal : null, openingComplete,
                subsequentOpeningTotal, reportTotalsComplete ? purchasedTotal : null,
                reportTotalsComplete ? soldTotal : null,
                reportTotalsComplete && directionsKnownOverall ? adjustmentIncreaseTotal : null,
                reportTotalsComplete && directionsKnownOverall ? adjustmentDecreaseTotal : null,
                reportTotalsComplete ? adjustmentQuantityTotal : null,
                closingComplete ? closingTotal : null, closingComplete,
                closingComplete, closingComplete ? (long) restockCount : null,
                List.copyOf(productReports));
    }

    private Month noHistoryMonth(int monthNumber, String monthName) {
        return new Month(monthNumber, monthName, CoverageStatus.NO_HISTORICAL_TRANSACTION_DATA,
                null, null, null, false, null, null, null, null, null, null,
                null, false, false, null, List.of());
    }

    private boolean isMovementAfterOpening(StockTransaction transaction, StockTransaction opening) {
        if (transaction.getType() == StockTransactionType.OPENING_STOCK) return false;
        int timeOrder = transaction.getEffectiveAt().compareTo(opening.getEffectiveAt());
        if (timeOrder != 0) return timeOrder > 0;
        return transaction.getId() != null && opening.getId() != null
                && transaction.getId() > opening.getId();
    }

    private long applyMovement(long balance, StockTransaction transaction) {
        return switch (transaction.getType()) {
            case PURCHASE -> Math.addExact(balance, transaction.getQuantity());
            case SALE -> Math.subtractExact(balance, transaction.getQuantity());
            case ADJUSTMENT -> transaction.getAdjustmentDirection() == AdjustmentDirection.INCREASE
                    ? Math.addExact(balance, transaction.getQuantity())
                    : transaction.getAdjustmentDirection() == AdjustmentDirection.DECREASE
                    ? Math.subtractExact(balance, transaction.getQuantity()) : balance;
            case OPENING_STOCK -> balance;
        };
    }
}
