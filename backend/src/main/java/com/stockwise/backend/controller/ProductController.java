
package com.stockwise.backend.controller;

import com.stockwise.backend.entity.Product;
import com.stockwise.backend.repository.ProductRepository;
import com.stockwise.backend.service.ProductService;

import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductRepository productRepository;
    private final ProductService productService;

    public ProductController(ProductRepository productRepository, ProductService productService) {
        this.productRepository = productRepository;
        this.productService = productService;
    }

    // Get all products
    @GetMapping
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    // Add a new product
    @PostMapping
    public Product addProduct(@RequestBody Product product, Authentication auth) {
        return productService.create(product, auth == null ? null : auth.getName());
    }
    // Update an existing product
@PutMapping("/{id}")
public Product updateProduct(@PathVariable Long id,
                             @RequestBody Product product) {
    return productService.update(id, product);
}
// Delete a product
@DeleteMapping("/{id}")
public String deleteProduct(@PathVariable Long id) {
    productService.delete(id);
    return "Product deleted successfully!";
}
}

