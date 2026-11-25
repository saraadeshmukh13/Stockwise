
package com.stockwise.backend.controller;

import com.stockwise.backend.service.SegmentTreeService;
import com.stockwise.backend.repository.ProductRepository;
import com.stockwise.backend.entity.Product;

import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Sort;
import java.util.*;

@RestController
@RequestMapping("/api/inventory")
public class SegmentTreeController {

    private final ProductRepository productRepository;

    public SegmentTreeController(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @GetMapping("/range-sum")
    public Map<String, Object> getRangeSum(
            @RequestParam int start,
            @RequestParam int end) {

        List<Product> products = productRepository.findAll(Sort.by(Sort.Direction.ASC, "id"));

        if (start < 0 || end >= products.size() || start > end) {
            throw new IllegalArgumentException("Invalid product range");
        }

        int[] quantities = products.stream()
                .mapToInt(Product::getQuantity)
                .toArray();

        SegmentTreeService segmentTree =
                new SegmentTreeService(quantities);

        long total = segmentTree.querySum(start, end);

        Map<String, Object> response = new HashMap<>();
        response.put("startIndex", start);
        response.put("endIndex", end);
        response.put("totalStock", total);

        return response;
    }
}

