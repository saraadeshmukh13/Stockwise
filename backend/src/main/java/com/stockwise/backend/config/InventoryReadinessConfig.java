package com.stockwise.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class InventoryReadinessConfig implements WebMvcConfigurer {
    private final InventoryInitializationGate gate;
    public InventoryReadinessConfig(InventoryInitializationGate gate) { this.gate=gate; }

    @Override public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(gate).addPathPatterns(
                "/api/products", "/api/products/**", "/api/inventory/**", "/api/warehouse/**", "/api/reorder/**");
    }
}
