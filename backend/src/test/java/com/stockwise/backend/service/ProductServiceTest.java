package com.stockwise.backend.service;

import com.stockwise.backend.entity.Product;
import com.stockwise.backend.repository.ProductRepository;
import com.stockwise.backend.repository.StockTransactionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {
    @Mock ProductRepository products;
    @Mock StockService stock;
    @Mock StockTransactionRepository transactions;

    @Test void updateKeepsExistingQuantityAndAllowsCatalogFieldEdits() {
        ProductService service = new ProductService(products, stock, transactions);
        Product current = product(8);
        current.setStockAddedDate(java.time.LocalDate.of(2026, 11, 23));
        Product patch = product(8); patch.setName("Renamed"); patch.setPrice(new java.math.BigDecimal("12.00"));
        patch.setStockAddedDate(java.time.LocalDate.of(2026, 11, 21));
        when(products.findByIdForUpdate(1L)).thenReturn(Optional.of(current));
        when(products.save(current)).thenReturn(current);
        Product result = service.update(1L, patch);
        assertEquals(8, result.getQuantity());
        assertEquals(4, result.getUnallocatedQuantity());
        assertEquals("Renamed", result.getName());
        assertEquals(java.time.LocalDate.of(2026, 11, 23), result.getStockAddedDate());
    }

    @Test void updateRejectsQuantityChangesAndKeepsLedgerAsOnlyStockWritePath() {
        ProductService service = new ProductService(products, stock, transactions);
        Product current = product(8);
        Product patch = product(9);
        when(products.findByIdForUpdate(1L)).thenReturn(Optional.of(current));
        assertThrows(ResponseStatusException.class, () -> service.update(1L, patch));
        verify(products, never()).save(any());
    }

    @Test void deleteRefusesProductsWithPermanentHistory() {
        ProductService service = new ProductService(products, stock, transactions);
        when(products.findByIdForUpdate(1L)).thenReturn(Optional.of(product(8)));
        when(transactions.existsByProduct_Id(1L)).thenReturn(true);
        assertThrows(ResponseStatusException.class, () -> service.delete(1L));
        verify(products, never()).deleteById(any());
    }

    private Product product(int quantity) {
        Product p=new Product(); p.setId(1L); p.setName("Widget"); p.setSku("W1");
        p.setQuantity(quantity); p.setUnallocatedQuantity(4); p.setReorderLevel(2); p.setDailyDemand(1);
        return p;
    }
}
