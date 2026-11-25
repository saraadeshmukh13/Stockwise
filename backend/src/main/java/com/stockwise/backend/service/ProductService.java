package com.stockwise.backend.service;

import com.stockwise.backend.entity.Product;
import com.stockwise.backend.repository.ProductRepository;
import com.stockwise.backend.repository.StockTransactionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProductService {
    private final ProductRepository products;
    private final StockService stockService;
    private final StockTransactionRepository transactions;
    public ProductService(ProductRepository products, StockService stockService, StockTransactionRepository transactions) {
        this.products=products; this.stockService=stockService; this.transactions=transactions;
    }
    public Product create(Product product, String actor) { return stockService.createProduct(product, actor); }

    @Transactional
    public Product update(Long id, Product patch) {
        Product current = products.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        if (patch.getQuantity() != current.getQuantity()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Quantity changes must use POST /api/inventory/adjustments");
        }
        current.setName(patch.getName());
        current.setSku(patch.getSku());
        current.setCategory(patch.getCategory());
        current.setReorderLevel(patch.getReorderLevel());
        current.setPrice(patch.getPrice());
        current.setDailyDemand(patch.getDailyDemand());
        return products.save(current);
    }

    @Transactional
    public void delete(Long id) {
        products.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        if (transactions.existsByProduct_Id(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Products with stock transaction history cannot be deleted");
        }
        products.deleteById(id);
    }
}
