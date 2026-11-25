
package com.stockwise.backend.controller;

import com.stockwise.backend.entity.Product;
import com.stockwise.backend.repository.ProductRepository;
import com.stockwise.backend.service.TrieService;

import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/products")
public class TrieController {

    private final TrieService trieService;
    private final ProductRepository productRepository;

    public TrieController(TrieService trieService,
                          ProductRepository productRepository) {
        this.trieService = trieService;
        this.productRepository = productRepository;
    }

    @GetMapping("/search")
    public List<Product> searchProducts(@RequestParam String prefix) {

        List<Product> products = productRepository.findAll();

        for (Product product : products) {
            trieService.insert(product.getName());
        }

        List<String> matchingNames = trieService.search(prefix);

        List<Product> results = new ArrayList<>();

        for (Product product : products) {
            if (matchingNames.contains(product.getName().toLowerCase())) {
                results.add(product);
            }
        }

        return results;
    }
}

