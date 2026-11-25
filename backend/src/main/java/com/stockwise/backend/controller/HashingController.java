
package com.stockwise.backend.controller;

import com.stockwise.backend.entity.Product;
import com.stockwise.backend.service.HashingService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products")
public class HashingController {

    private final HashingService hashingService;

    public HashingController(HashingService hashingService) {
        this.hashingService = hashingService;
    }

    @GetMapping("/sku/{sku}")
    public Product searchBySku(@PathVariable String sku) {
        return hashingService.searchBySku(sku);
    }
}

