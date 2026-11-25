package com.stockwise.backend.config;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.server.ResponseStatusException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class InventoryInitializationGate implements HandlerInterceptor {
    private volatile boolean initialized;

    public boolean isInitialized() { return initialized; }
    public void markNotInitialized() { initialized = false; }
    public void markInitialized() { initialized = true; }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!initialized) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Inventory initialization has not completed");
        return true;
    }
}
