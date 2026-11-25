
package com.stockwise.backend.controller;

import com.stockwise.backend.entity.Product;
import com.stockwise.backend.service.HeapService;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/reorder")
public class ReorderController {

    private final HeapService heapService;

    public ReorderController(HeapService heapService) {
        this.heapService = heapService;
    }

    @GetMapping("/priority")
    public List<Product> getReorderPriority() {
        return heapService.getReorderPriority();
    }
}

