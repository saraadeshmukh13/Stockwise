package com.stockwise.backend.dto;

import java.time.LocalDate;
import java.util.List;

public final class MonthlyStockReportViews {
    private MonthlyStockReportViews() {}

    public enum CoverageStatus {
        NO_HISTORICAL_TRANSACTION_DATA,
        PARTIAL_FROM_OPENING_DATE
    }

    public record Report(int year, String reportingTimezone, LocalDate generatedThrough,
                         List<Month> months) {}

    public record Month(int month, String monthName, CoverageStatus status,
                        LocalDate coverageStart, LocalDate coverageEnd,
                        Long openingStock, boolean openingStockComplete,
                        Long subsequentOpeningStock, Long purchasedQuantity, Long soldQuantity,
                        Long adjustmentIncrease, Long adjustmentDecrease, Long adjustmentQuantity,
                        Long closingStock, boolean closingStockComplete,
                        Boolean restockSuggestionsAvailable, Long restockSuggestionCount,
                        List<ProductMonth> products) {}

    public record ProductMonth(Long productId, String productName, String sku,
                               Integer reorderLevel, Integer dailyDemand,
                               Long openingStock, Long subsequentOpeningStock,
                               Long purchasedQuantity, Long soldQuantity,
                               Long adjustmentIncrease, Long adjustmentDecrease,
                               Long adjustmentQuantity, Long closingStock,
                               Boolean restockSuggested, Double estimatedDaysRemaining) {}
}
