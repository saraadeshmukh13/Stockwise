package com.stockwise.backend;

import com.stockwise.backend.controller.*;
import com.stockwise.backend.entity.Product;
import com.stockwise.backend.repository.ProductRepository;
import com.stockwise.backend.service.HashingService;
import com.stockwise.backend.service.HeapService;
import com.stockwise.backend.service.SegmentTreeService;
import com.stockwise.backend.service.TrieService;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CompatibilityContractTest {
    @Test void existingProductCrudAndDsaRoutesRemainMapped() throws Exception {
        assertEquals("/api/products", ProductController.class.getAnnotation(RequestMapping.class).value()[0]);
        assertNotNull(ProductController.class.getMethod("getAllProducts").getAnnotation(GetMapping.class));
        assertNotNull(ProductController.class.getMethod("addProduct", com.stockwise.backend.entity.Product.class,
                org.springframework.security.core.Authentication.class).getAnnotation(PostMapping.class));
        assertNotNull(ProductController.class.getMethod("updateProduct", Long.class,
                com.stockwise.backend.entity.Product.class).getAnnotation(PutMapping.class));
        assertNotNull(ProductController.class.getMethod("deleteProduct", Long.class).getAnnotation(DeleteMapping.class));

        assertEquals("/api/products", TrieController.class.getAnnotation(RequestMapping.class).value()[0]);
        assertEquals("/api/products", HashingController.class.getAnnotation(RequestMapping.class).value()[0]);
        assertEquals("/api/inventory", SegmentTreeController.class.getAnnotation(RequestMapping.class).value()[0]);
        assertEquals("/api/reorder", ReorderController.class.getAnnotation(RequestMapping.class).value()[0]);
        assertArrayEquals(new String[]{"/search"}, TrieController.class.getMethod("searchProducts", String.class)
                .getAnnotation(GetMapping.class).value());
        assertArrayEquals(new String[]{"/sku/{sku}"}, HashingController.class.getMethod("searchBySku", String.class)
                .getAnnotation(GetMapping.class).value());
        assertArrayEquals(new String[]{"/range-sum"}, SegmentTreeController.class.getMethod("getRangeSum", int.class, int.class)
                .getAnnotation(GetMapping.class).value());
        assertArrayEquals(new String[]{"/priority"}, ReorderController.class.getMethod("getReorderPriority")
                .getAnnotation(GetMapping.class).value());
        assertEquals(6, new SegmentTreeService(new int[]{1, 2, 3}).querySum(0, 2));
    }

    @Test void existingTrieHashMapAndHeapOperationsStillUseProductFields() {
        Product p=new Product(); p.setId(1L); p.setName("Widget Pro"); p.setSku("W-PRO");
        p.setQuantity(3); p.setReorderLevel(5); p.setDailyDemand(1);
        ProductRepository repository=mock(ProductRepository.class);
        when(repository.findAll()).thenReturn(List.of(p));

        assertEquals(p, new HashingService(repository).searchBySku("W-PRO"));
        TrieService trie=new TrieService(); trie.insert("Widget Pro");
        assertTrue(trie.search("Wid").contains("widget pro"));
        assertEquals(List.of(p), new HeapService(repository).getReorderPriority());
    }
}
