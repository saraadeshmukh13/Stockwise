package com.stockwise.backend.controller;

import com.stockwise.backend.dto.StockRequests.*;
import com.stockwise.backend.entity.StockTransactionType;
import com.stockwise.backend.service.StockService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import com.stockwise.backend.dto.StockViews.TransactionView;
import com.stockwise.backend.dto.MonthlyStockReportViews.Report;
import com.stockwise.backend.service.MonthlyStockReportService;

@RestController
@RequestMapping("/api/inventory")
public class StockController {
    private final StockService stock;
    private final MonthlyStockReportService monthlyReports;
    public StockController(StockService stock, MonthlyStockReportService monthlyReports) {
        this.stock=stock;
        this.monthlyReports=monthlyReports;
    }

    @PostMapping("/opening-stock")
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionView opening(@Valid @RequestBody OpeningStockRequest request, Authentication auth) {
        return stock.recordOpeningStock(request.productId(), actor(auth));
    }
    @PostMapping("/purchases")
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionView purchase(@Valid @RequestBody PurchaseRequest request, Authentication auth) {
        return stock.purchase(request, actor(auth));
    }
    @PostMapping("/sales")
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionView sale(@Valid @RequestBody SaleRequest request, Authentication auth) {
        return stock.sale(request, actor(auth));
    }
    @PostMapping("/adjustments")
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionView adjust(@Valid @RequestBody AdjustmentRequest request, Authentication auth) {
        return stock.adjust(request, actor(auth));
    }
    @GetMapping("/transactions")
    public Page<TransactionView> history(@RequestParam(required=false) Long productId,
            @RequestParam(required=false) StockTransactionType type,
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate toDate,
            @PageableDefault(size=50, sort="effectiveAt") Pageable pageable) {
        return stock.history(productId, type, fromDate, toDate, pageable);
    }

    @GetMapping("/reports/monthly")
    public Report monthlyReport(@RequestParam(required=false) Integer year,
                                @RequestParam(required=false) Integer month) {
        if (year == null && month == null) return monthlyReports.monthlyReport();
        if (year == null || year < 1 || year > 9999 || month == null || month < 1 || month > 12) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Both year and month are required, and month must be 1–12");
        }
        return monthlyReports.monthlyReport(year, month);
    }

    private String actor(Authentication auth) { return auth == null ? null : auth.getName(); }
}
