package com.stockwise.backend.config;

import com.stockwise.backend.service.OpeningStockInitializer;
import com.stockwise.backend.service.StockService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.ApplicationArguments;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.handler.MappedInterceptor;
import org.springframework.web.util.ServletRequestPathUtils;
import java.util.List;
import java.lang.reflect.Method;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class InventoryReadinessTest {
    @Test void inventoryRoutesStayUnavailableUntilInitializerCompletes() throws Exception {
        InventoryInitializationGate gate = new InventoryInitializationGate();
        StockService stock = mock(StockService.class);
        OpeningStockInitializer initializer = new OpeningStockInitializer(stock, gate);
        ExposedRegistry registry = new ExposedRegistry();
        new InventoryReadinessConfig(gate).addInterceptors(registry);
        MappedInterceptor mapped = (MappedInterceptor) registry.registered().getFirst();
        assertFalse(gate.isInitialized());
        for (String path : List.of("/api/products", "/api/inventory/purchases", "/api/warehouse/shelves", "/api/reorder/priority")) {
            var request = request(path);
            assertTrue(mapped.matches(request), path + " must be gated");
            assertEquals(HttpStatus.SERVICE_UNAVAILABLE, assertThrows(ResponseStatusException.class,
                    () -> mapped.preHandle(request, new MockHttpServletResponse(), new Object())).getStatusCode());
        }
        assertFalse(mapped.matches(request("/api/health")));

        initializer.run(mock(ApplicationArguments.class));

        assertTrue(gate.isInitialized());
        assertTrue(mapped.preHandle(request("/api/products"), new MockHttpServletResponse(), new Object()));
        verify(stock).initializeLegacyProducts();
    }

    @Test void failureLeavesGateClosedAndInitializationRunsBeforeOtherRunners() throws Exception {
        InventoryInitializationGate gate = new InventoryInitializationGate();
        StockService stock = mock(StockService.class);
        doThrow(new IllegalStateException("reconciliation failed")).when(stock).initializeLegacyProducts();
        OpeningStockInitializer initializer = new OpeningStockInitializer(stock, gate);

        assertThrows(IllegalStateException.class, () -> initializer.run(mock(ApplicationArguments.class)));
        assertFalse(gate.isInitialized());
        var order = OpeningStockInitializer.class.getAnnotation(org.springframework.core.annotation.Order.class);
        assertNotNull(order);
        assertEquals(org.springframework.core.Ordered.HIGHEST_PRECEDENCE, order.value());
        Method initialize = StockService.class.getMethod("initializeLegacyProducts");
        assertTrue(initialize.isAnnotationPresent(org.springframework.transaction.annotation.Transactional.class));
    }

    private static class ExposedRegistry extends InterceptorRegistry {
        List<Object> registered() { return getInterceptors(); }
    }
    private MockHttpServletRequest request(String path) {
        var request = new MockHttpServletRequest("GET", path);
        ServletRequestPathUtils.parseAndCache(request);
        return request;
    }
}
