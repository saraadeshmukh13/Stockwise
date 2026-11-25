package com.stockwise.backend.auth;

import org.springframework.stereotype.Component;

@Component
public class AdminBootstrapGate {
    private volatile boolean ready;

    public boolean isReady() {
        return ready;
    }

    public void markNotReady() {
        ready = false;
    }

    public void markReady() {
        ready = true;
    }
}
