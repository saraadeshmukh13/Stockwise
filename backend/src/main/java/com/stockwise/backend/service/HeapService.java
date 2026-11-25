
package com.stockwise.backend.service;

import com.stockwise.backend.entity.Product;
import com.stockwise.backend.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.PriorityQueue;
import java.util.Comparator;

@Service
public class HeapService {

    private final ProductRepository productRepository;

    public HeapService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    // Calculate how urgently a product needs restocking
    private double calculateUrgency(Product product) {

        if (product.getDailyDemand() <= 0) {
            return Double.MAX_VALUE;
        }

        return (double) product.getQuantity()
                / product.getDailyDemand();
    }

    // Priority Queue using a Min Heap
    public List<Product> getReorderPriority() {

        PriorityQueue<Product> priorityQueue =
            new PriorityQueue<>(
                Comparator.comparingDouble(this::calculateUrgency)
            );

        List<Product> products = productRepository.findAll();

        for (Product product : products) {
            if (product.getQuantity() <= product.getReorderLevel()) {
                priorityQueue.add(product);
            }
        }

        List<Product> prioritizedProducts =
                new java.util.ArrayList<>();

        while (!priorityQueue.isEmpty()) {
            prioritizedProducts.add(priorityQueue.poll());
        }

        return prioritizedProducts;
    }
}
