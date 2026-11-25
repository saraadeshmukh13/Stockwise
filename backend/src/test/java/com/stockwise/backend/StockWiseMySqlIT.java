package com.stockwise.backend;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.stockwise.backend.config.InventoryInitializationGate;
import com.stockwise.backend.dto.StockRequests.AdjustmentRequest;
import com.stockwise.backend.dto.StockRequests.PurchaseRequest;
import com.stockwise.backend.dto.StockRequests.SaleRequest;
import com.stockwise.backend.entity.AdjustmentDirection;
import com.stockwise.backend.entity.Product;
import com.stockwise.backend.entity.ShelfInventory;
import com.stockwise.backend.entity.StockTransactionType;
import com.stockwise.backend.entity.WarehouseRack;
import com.stockwise.backend.entity.WarehouseShelf;
import com.stockwise.backend.repository.ProductRepository;
import com.stockwise.backend.repository.ShelfInventoryRepository;
import com.stockwise.backend.repository.StockTransactionRepository;
import com.stockwise.backend.repository.WarehouseRackRepository;
import com.stockwise.backend.repository.WarehouseShelfRepository;
import com.stockwise.backend.service.ProductService;
import com.stockwise.backend.service.StockService;
import com.stockwise.backend.service.WarehouseService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.mock.web.MockHttpSession;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.containers.MySQLContainer;

import jakarta.servlet.http.Cookie;
import java.math.BigDecimal;
import java.net.URI;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Runs only through Maven Failsafe's explicit mysql-integration profile. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@ContextConfiguration(initializers = StockWiseMySqlIT.ContainerDatabaseGuard.class)
@Testcontainers
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class StockWiseMySqlIT {
    private static final String DATABASE = "stockwise_test";
    private static final String IMAGE = "mysql:8.4.7";

    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>(IMAGE)
            .withDatabaseName(DATABASE)
            .withUsername("stockwise_test")
            .withPassword("stockwise_test_only")
            .withInitScript("db/legacy-products.sql");

    @DynamicPropertySource
    static void containerProperties(DynamicPropertyRegistry registry) {
        ensureContainerStarted();
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("stockwise.testcontainer.jdbc-url", MYSQL::getJdbcUrl);
        registry.add("stockwise.testcontainer.username", MYSQL::getUsername);
        registry.add("stockwise.testcontainer.password", MYSQL::getPassword);
    }

    /** Runs before context refresh (and therefore before Hibernate can issue DDL). */
    public static final class ContainerDatabaseGuard implements ApplicationContextInitializer<ConfigurableApplicationContext> {
        @Override
        public void initialize(ConfigurableApplicationContext context) {
            ensureContainerStarted();
            ConfigurableEnvironment environment = context.getEnvironment();
            String url = required(environment, "spring.datasource.url");
            String expectedUrl = required(environment, "stockwise.testcontainer.jdbc-url");
            String username = required(environment, "spring.datasource.username");
            String expectedUsername = required(environment, "stockwise.testcontainer.username");
            String password = required(environment, "spring.datasource.password");
            String expectedPassword = required(environment, "stockwise.testcontainer.password");
            String database = URI.create(url.substring("jdbc:mysql:".length())).getPath();
            if (database != null && database.startsWith("/")) database = database.substring(1);
            if (database != null && database.contains("/")) database = database.substring(0, database.indexOf('/'));
            if (database != null && database.contains("?")) database = database.substring(0, database.indexOf('?'));
            if (!url.equals(expectedUrl) || !DATABASE.equals(database)
                    || !username.equals(expectedUsername) || !password.equals(expectedPassword)) {
                throw new IllegalStateException("Refusing MySQL integration tests: datasource is not the stockwise_test Testcontainers instance");
            }
        }

        private static String required(ConfigurableEnvironment environment, String key) {
            String value = environment.getProperty(key);
            if (value == null || value.isBlank()) throw new IllegalStateException("Missing fail-closed Testcontainers property: " + key);
            return value;
        }
    }

    @Autowired JdbcTemplate jdbc;
    @Autowired ProductRepository products;
    @Autowired StockTransactionRepository transactions;
    @Autowired ShelfInventoryRepository allocations;
    @Autowired WarehouseRackRepository racks;
    @Autowired WarehouseShelfRepository shelves;
    @Autowired ProductService productService;
    @Autowired StockService stockService;
    @Autowired WarehouseService warehouseService;
    @Autowired InventoryInitializationGate readiness;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;

    @BeforeEach
    void assertDatabaseAndStartupReadinessBeforeTestWork() {
        assertEquals(DATABASE, jdbc.queryForObject("SELECT DATABASE()", String.class));
        assertTrue(readiness.isInitialized(), "stock APIs must be ready after successful application startup");
    }

    @Test
    void testContainerIsRunningBeforeItsDatasourceDetailsAreUsed() {
        assertTrue(MYSQL.isRunning());
        assertTrue(MYSQL.getJdbcUrl().contains("/" + DATABASE));
    }

    @Test
    void hibernateGeneratesPhaseOneSchemaAndMySqlEnforcesOpeningConstraints() {
        for (String table : List.of("products", "stock_transactions", "warehouse_racks", "warehouse_shelves", "shelf_inventory", "app_users")) {
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?", Integer.class, table), table);
        }
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'unallocated_quantity'", Integer.class));
        for (String[] tableColumn : List.of(
                new String[]{"stock_transactions", "opening_stock_product_id"},
                new String[]{"stock_transactions", "effective_at"},
                new String[]{"stock_transactions", "adjustment_direction"},
                new String[]{"stock_transactions", "actor_username"},
                new String[]{"warehouse_shelves", "rack_id"},
                new String[]{"warehouse_shelves", "max_capacity"},
                new String[]{"warehouse_shelves", "used_capacity"},
                new String[]{"shelf_inventory", "product_id"},
                new String[]{"shelf_inventory", "shelf_id"},
                new String[]{"shelf_inventory", "quantity"})) {
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?", Integer.class, tableColumn[0], tableColumn[1]), tableColumn[0] + "." + tableColumn[1]);
        }
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'stock_transactions' AND column_name = 'opening_stock_product_id' AND non_unique = 0", Integer.class));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = DATABASE() AND table_name = 'stock_transactions' AND constraint_name = 'ck_stock_tx_opening_key' AND constraint_type = 'CHECK'", Integer.class));

        assertThrows(RuntimeException.class, () -> jdbc.update("INSERT INTO stock_transactions (product_id, transaction_type, quantity, effective_at, opening_stock_product_id) VALUES (1001, 'OPENING_STOCK', 42, ?, 1002)", Timestamp.from(StockService.OPENING_INSTANT)));
        assertThrows(RuntimeException.class, () -> jdbc.update("INSERT INTO stock_transactions (product_id, transaction_type, quantity, effective_at, opening_stock_product_id) VALUES (1001, 'OPENING_STOCK', 42, ?, 1001)", Timestamp.from(StockService.OPENING_INSTANT)));
    }

    @Test
    void legacyOpeningBalancesIncludeZeroAndRepeatedStartupDoesNotDuplicateTransactions() {
        Product legacyProduct = products.findById(1001L).orElseThrow();
        assertEquals(42, legacyProduct.getQuantity());
        assertEquals(42, allocations.sumForProduct(1001L) + legacyProduct.getUnallocatedQuantity());
        assertEquals(0, products.findById(1002L).orElseThrow().getQuantity());
        assertEquals(0, products.findById(1002L).orElseThrow().getUnallocatedQuantity());
        var legacyOpening = transactions.findFirstByProduct_IdAndType(1001L, StockTransactionType.OPENING_STOCK).orElseThrow();
        assertEquals(42, legacyOpening.getQuantity());
        assertEquals(1, transactions.findAll().stream().filter(t -> t.getProduct().getId().equals(1001L) && t.getType() == StockTransactionType.OPENING_STOCK).count());
        assertEquals(1, transactions.findAll().stream().filter(t -> t.getProduct().getId().equals(1002L) && t.getType() == StockTransactionType.OPENING_STOCK).count());
        long countBeforeRestart = transactions.count();

        try (ConfigurableApplicationContext secondStartup = startAnotherApplicationContext()) {
            assertTrue(secondStartup.isActive());
        }
        assertEquals(countBeforeRestart, transactions.count(), "second startup must not add opening ledger entries");
        assertEquals(1, transactions.findAll().stream().filter(t -> t.getProduct().getId().equals(1002L) && t.getType() == StockTransactionType.OPENING_STOCK).count());
    }

    @Test
    void initializerReconcilesShelfUsageAndPreservesAllocatedPlusUnallocatedInvariant() {
        Product product = products.findById(1001L).orElseThrow();
        WarehouseShelf shelf = newShelf(10);
        stockService.allocate(product.getId(), shelf.getId(), 6);
        jdbc.update("UPDATE warehouse_shelves SET used_capacity = 1 WHERE id = ?", shelf.getId());

        stockService.initializeLegacyProducts();

        assertEquals(6, warehouseService.shelfQuantity(shelf.getId()));
        Product refreshed = products.findById(product.getId()).orElseThrow();
        assertEquals(42, refreshed.getQuantity());
        assertEquals(36, refreshed.getUnallocatedQuantity());
        assertEquals(42, allocations.sumForProduct(product.getId()) + refreshed.getUnallocatedQuantity());
    }

    @Test
    void startupFailsWhenExistingAllocationExceedsShelfCapacity() {
        Product product = newProduct(2);
        WarehouseShelf shelf = newShelf(1);
        jdbc.update("INSERT INTO shelf_inventory (product_id, shelf_id, quantity) VALUES (?, ?, 2)", product.getId(), shelf.getId());

        assertThrows(RuntimeException.class, this::startAnotherApplicationContext,
                "initializer must fail startup when reconciled allocation exceeds capacity");

        jdbc.update("DELETE FROM shelf_inventory WHERE product_id = ? AND shelf_id = ?", product.getId(), shelf.getId());
        stockService.initializeLegacyProducts();
    }

    @Test
    void purchaseSaleAdjustmentAndCapacityChecksRemainAtomic() {
        Product product = newProduct(0);
        WarehouseShelf shelf = newShelf(5);
        stockService.purchase(new PurchaseRequest(product.getId(), 4, new BigDecimal("2.50"), shelf.getId(), "PO-IT", null, Instant.now()), "integration-admin");
        assertInventory(product.getId(), 4, 0, shelf.getId(), 4);

        stockService.sale(new SaleRequest(product.getId(), 2, new BigDecimal("4.00"), shelf.getId(), "ORDER-IT", null, Instant.now()), "integration-admin");
        assertInventory(product.getId(), 2, 0, shelf.getId(), 2);
        stockService.adjust(new AdjustmentRequest(product.getId(), AdjustmentDirection.INCREASE, 3, "count correction", null, Instant.now()), "integration-admin");
        assertInventory(product.getId(), 5, 3, shelf.getId(), 2);

        assertThrows(ResponseStatusException.class, () -> stockService.purchase(new PurchaseRequest(product.getId(), 4, BigDecimal.ONE, shelf.getId(), "OVER-CAPACITY", null, Instant.now()), "integration-admin"));
        assertInventory(product.getId(), 5, 3, shelf.getId(), 2);
        assertEquals(StockTransactionType.PURCHASE, transactions.findAll().stream().filter(t -> t.getProduct().getId().equals(product.getId())).findAny().orElseThrow().getType());
        assertEquals(4, transactions.findAll().stream().filter(t -> t.getProduct().getId().equals(product.getId())).count());
    }

    @Test
    void timestampsRoundTripAsUtcAndDateFiltersUseAsiaKolkata() {
        var opening = transactions.findFirstByProduct_IdAndType(1001L, StockTransactionType.OPENING_STOCK).orElseThrow();
        assertEquals(StockService.OPENING_INSTANT, opening.getEffectiveAt());
        Timestamp stored = jdbc.queryForObject("SELECT effective_at FROM stock_transactions WHERE product_id = 1001 AND transaction_type = 'OPENING_STOCK'", (rs, row) -> rs.getTimestamp(1, java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("UTC"))));
        assertEquals(StockService.OPENING_INSTANT, stored.toInstant());
        assertEquals(LocalDate.of(2026, 11, 23), opening.getEffectiveAt().atZone(StockService.REPORTING_ZONE).toLocalDate());

        var onOpeningDate = stockService.history(1001L, StockTransactionType.OPENING_STOCK, LocalDate.of(2026, 11, 23), LocalDate.of(2026, 11, 23), org.springframework.data.domain.PageRequest.of(0, 20));
        var priorDate = stockService.history(1001L, StockTransactionType.OPENING_STOCK, LocalDate.of(2026, 11, 22), LocalDate.of(2026, 11, 22), org.springframework.data.domain.PageRequest.of(0, 20));
        assertEquals(1, onOpeningDate.getTotalElements());
        assertEquals(0, priorDate.getTotalElements());
    }

    @Test
    void concurrentPurchasesAndSalesSerializeOnProductAndShelfLocks() throws Exception {
        Product purchased = newProduct(0);
        WarehouseShelf purchaseShelf = newShelf(4);
        List<Boolean> purchaseResults = runTogether(
                () -> stockService.purchase(new PurchaseRequest(purchased.getId(), 2, BigDecimal.ONE, purchaseShelf.getId(), "CONCURRENT-P1", null, Instant.now()), "integration-admin"),
                () -> stockService.purchase(new PurchaseRequest(purchased.getId(), 2, BigDecimal.ONE, purchaseShelf.getId(), "CONCURRENT-P2", null, Instant.now()), "integration-admin"));
        assertEquals(List.of(true, true), purchaseResults);
        assertInventory(purchased.getId(), 4, 0, purchaseShelf.getId(), 4);

        Product sold = newProduct(2);
        WarehouseShelf saleShelf = newShelf(2);
        stockService.allocate(sold.getId(), saleShelf.getId(), 2);
        List<Boolean> saleResults = runTogether(
                () -> stockService.sale(new SaleRequest(sold.getId(), 2, BigDecimal.ONE, saleShelf.getId(), "CONCURRENT-S1", null, Instant.now()), "integration-admin"),
                () -> stockService.sale(new SaleRequest(sold.getId(), 2, BigDecimal.ONE, saleShelf.getId(), "CONCURRENT-S2", null, Instant.now()), "integration-admin"));
        assertEquals(1, saleResults.stream().filter(Boolean::booleanValue).count());
        assertEquals(0, products.findById(sold.getId()).orElseThrow().getQuantity());
        assertEquals(0, warehouseService.shelfQuantity(saleShelf.getId()));
    }

    @Test
    void databaseFailureAfterInventoryWritesRollsBackTheWholeMovement() {
        Product product = newProduct(3);
        WarehouseShelf shelf = newShelf(10);
        stockService.allocate(product.getId(), shelf.getId(), 2);
        long before = transactions.count();
        assertThrows(RuntimeException.class, () -> stockService.purchase(
                new PurchaseRequest(product.getId(), 2, BigDecimal.ONE, shelf.getId(), "ROLLBACK-IT", null, Instant.now()), "x".repeat(81)));

        assertInventory(product.getId(), 3, 1, shelf.getId(), 2);
        assertEquals(before, transactions.count());
    }

    @Test
    void authenticatedProductCrudCsrfAndDsaEndpointsRemainCompatible() throws Exception {
        // SecurityConfig disables form login and HTTP Basic without installing a 401 entry point,
        // so Spring Security currently rejects anonymous protected requests with 403.
        mvc.perform(get("/api/products")).andExpect(status().isForbidden());
        mvc.perform(get("/api/health")).andExpect(status().isOk());

        MvcResult csrfResult = mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andReturn();
        JsonNode csrfJson = objectMapper.readTree(csrfResult.getResponse().getContentAsString());
        String csrfToken = csrfJson.get("token").asText();
        Cookie csrfCookie = csrfResult.getResponse().getCookie("XSRF-TOKEN");
        assertNotNull(csrfCookie);

        MvcResult login = mvc.perform(post("/api/auth/login").contentType("application/json")
                        .content("{\"username\":\"integration-admin\",\"password\":\"integration-test-password-12\"}"))
                .andExpect(status().isOk()).andReturn();
        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);
        assertNotNull(session);
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.role").value("ADMIN"));
        mvc.perform(get("/api/admin/users").session(session)).andExpect(status().isOk());

        String sku = "API-" + UUID.randomUUID();
        String body = "{\"name\":\"API Integration Part\",\"sku\":\"" + sku + "\",\"category\":\"test\",\"quantity\":3,\"reorderLevel\":1,\"price\":1.25,\"dailyDemand\":1}";
        MvcResult created = mvc.perform(post("/api/products").session(session).cookie(csrfCookie).header("X-XSRF-TOKEN", csrfToken)
                        .contentType("application/json").content(body))
                .andExpect(status().isOk()).andReturn();
        long productId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();
        mvc.perform(get("/api/products").session(session)).andExpect(status().isOk());
        mvc.perform(get("/api/products/search").param("prefix", "Legacy").session(session)).andExpect(status().isOk());
        mvc.perform(get("/api/products/sku/LEGACY-001").session(session)).andExpect(status().isOk());
        mvc.perform(get("/api/inventory/range-sum").param("start", "0").param("end", "1").session(session)).andExpect(status().isOk());
        mvc.perform(get("/api/reorder/priority").session(session)).andExpect(status().isOk());

        String update = "{\"name\":\"API Integration Part Updated\",\"sku\":\"" + sku + "\",\"category\":\"changed\",\"quantity\":3,\"reorderLevel\":1,\"price\":1.25,\"dailyDemand\":1}";
        mvc.perform(put("/api/products/" + productId).session(session).cookie(csrfCookie).header("X-XSRF-TOKEN", csrfToken)
                        .contentType("application/json").content(update))
                .andExpect(status().isOk());
        mvc.perform(delete("/api/products/" + productId).session(session).cookie(csrfCookie).header("X-XSRF-TOKEN", csrfToken))
                .andExpect(status().isConflict());
    }

    private ConfigurableApplicationContext startAnotherApplicationContext() {
        String[] args = {
                "--spring.profiles.active=integration-test",
                "--spring.datasource.url=" + MYSQL.getJdbcUrl(),
                "--spring.datasource.username=" + MYSQL.getUsername(),
                "--spring.datasource.password=" + MYSQL.getPassword(),
                "--stockwise.testcontainer.jdbc-url=" + MYSQL.getJdbcUrl(),
                "--stockwise.testcontainer.username=" + MYSQL.getUsername(),
                "--stockwise.testcontainer.password=" + MYSQL.getPassword(),
                "--spring.datasource.hikari.initialization-fail-timeout=10000"
        };
        return new SpringApplicationBuilder(BackendApplication.class)
                .initializers(new ContainerDatabaseGuard())
                .run(args);
    }

    private static synchronized void ensureContainerStarted() {
        if (!MYSQL.isRunning()) MYSQL.start();
    }

    private Product newProduct(int quantity) {
        Product product = new Product();
        product.setName("Integration Product " + UUID.randomUUID());
        product.setSku("IT-" + UUID.randomUUID());
        product.setCategory("integration");
        product.setQuantity(quantity);
        product.setReorderLevel(1);
        product.setPrice(BigDecimal.ONE);
        product.setDailyDemand(1);
        return productService.create(product, "integration-admin");
    }

    private WarehouseShelf newShelf(int capacity) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        WarehouseRack rack = racks.saveAndFlush(new WarehouseRack("R-" + suffix, "IT Rack " + suffix, null));
        return shelves.saveAndFlush(new WarehouseShelf("S-" + suffix, rack, capacity));
    }

    private void assertInventory(Long productId, int total, int unallocated, Long shelfId, int shelfQuantity) {
        Product product = products.findById(productId).orElseThrow();
        assertEquals(total, product.getQuantity());
        assertEquals(unallocated, product.getUnallocatedQuantity());
        long allocated = allocations.sumForProduct(productId);
        assertEquals(total, allocated + unallocated);
        List<Integer> storedAllocations = jdbc.query(
                "SELECT quantity FROM shelf_inventory WHERE product_id = ? AND shelf_id = ?",
                (rs, row) -> rs.getInt(1), productId, shelfId);
        assertEquals(shelfQuantity, storedAllocations.stream().findFirst().orElse(0));
        assertEquals(shelfQuantity, warehouseService.shelfQuantity(shelfId));
    }

    @SafeVarargs
    private final List<Boolean> runTogether(java.util.concurrent.Callable<?>... operations) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(operations.length);
        CountDownLatch ready = new CountDownLatch(operations.length);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<Boolean>> futures = java.util.Arrays.stream(operations).map(operation -> pool.submit(() -> {
                ready.countDown();
                if (!start.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Timed out waiting for concurrent start");
                try { operation.call(); return true; } catch (ResponseStatusException expectedConflict) { return false; }
            })).toList();
            assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();
            return futures.stream().map(f -> {
                try { return f.get(30, TimeUnit.SECONDS); }
                catch (Exception e) { throw new RuntimeException(e); }
            }).toList();
        } finally {
            pool.shutdownNow();
        }
    }
}
