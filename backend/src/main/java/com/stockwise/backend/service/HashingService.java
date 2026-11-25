
package com.stockwise.backend.service;

import com.stockwise.backend.entity.Product;
import com.stockwise.backend.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class HashingService {

    private final ProductRepository productRepository;

    public HashingService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public Map<String, Product> createProductHashMap() {

        List<Product> products = productRepository.findAll();

        Map<String, Product> productMap = new HashMap<>();

        for (Product product : products) {
            productMap.put(product.getSku(), product);
        }

        return productMap;
    }

    public Product searchBySku(String sku) {

        Map<String, Product> productMap = createProductHashMap();

        return productMap.get(sku);
    }
}

