package com.stockwise.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import com.stockwise.backend.config.InventoryInitializationGate;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class OpeningStockInitializer implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(OpeningStockInitializer.class);
    private final StockService stockService;
    private final InventoryInitializationGate gate;
    public OpeningStockInitializer(StockService stockService, InventoryInitializationGate gate) {
        this.stockService=stockService; this.gate=gate;
    }
    @Override public void run(ApplicationArguments args) {
        gate.markNotInitialized();
        stockService.initializeLegacyProducts();
        try {
            stockService.initializeWarehouseLayoutAndAllocations();
        } catch (Exception e) {
            log.warn("Warehouse layout/allocation initialization skipped: {}", e.getMessage());
        }
        // The @Transactional service call has committed before readiness is published.
        gate.markInitialized();
    }
}
