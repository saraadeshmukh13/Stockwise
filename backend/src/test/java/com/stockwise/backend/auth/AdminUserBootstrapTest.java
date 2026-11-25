package com.stockwise.backend.auth;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.Optional;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;

class AdminUserBootstrapTest {
    @Test
    void demoAdminPasswordIsEncodedAndAccountIsPromotedToAdmin() throws Exception {
        String username = "demo-admin";
        String password = "StockWiseAdmin2026!";
        AppUser user = new AppUser(username, "old-hash", AppRole.USER);
        setEnabled(user, false);
        AppUserRepository users = mock(AppUserRepository.class);
        when(users.findByUsername(username)).thenReturn(Optional.of(user));
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
        AdminBootstrapGate gate = new AdminBootstrapGate();
        StandardEnvironment environment = new StandardEnvironment();
        environment.setActiveProfiles("demo");
        environment.getPropertySources().addFirst(new MapPropertySource("demo-admin-test", Map.of(
                "STOCKWISE_DEMO_ADMIN_USERNAME", " " + username + " ",
                "STOCKWISE_DEMO_ADMIN_PASSWORD", password)));

        new AdminUserBootstrap()
                .createOrRefreshInitialAdmin(users, encoder, gate, environment, "admin", "a-different-generic-password",
                        "jdbc:mysql://localhost:3306/stockwise_demo")
                .run(new String[0]);

        assertEquals(username, user.getUsername());
        assertEquals(AppRole.ADMIN, user.getRole());
        assertTrue(user.isEnabled());
        assertNotEquals(password, user.getPasswordHash());
        assertTrue(encoder.matches(password, user.getPasswordHash()));
        verify(users).save(user);

        Assertions.assertTrue(gate.isReady());
        var login = new AuthController(users, encoder, gate).login(
                new AuthController.LoginRequest(username, password),
                new MockHttpServletRequest(), new MockHttpServletResponse());
        Assertions.assertEquals(200, login.getStatusCode().value());
        Assertions.assertEquals("ADMIN", ((java.util.Map<?, ?>) login.getBody()).get("role"));
    }

    @Test
    void createsDemoAdminWhenNoMatchingAccountExists() throws Exception {
        String username = "demo-admin";
        String password = "StockWiseAdmin2026!";
        AppUserRepository users = mock(AppUserRepository.class);
        AdminBootstrapGate gate = new AdminBootstrapGate();
        when(users.findByUsername(username)).thenReturn(Optional.empty());
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
        StandardEnvironment environment = new StandardEnvironment();
        environment.setActiveProfiles("demo");
        environment.getPropertySources().addFirst(new MapPropertySource("demo-admin-create-test", Map.of(
                "STOCKWISE_DEMO_ADMIN_USERNAME", username,
                "STOCKWISE_DEMO_ADMIN_PASSWORD", password)));

        new AdminUserBootstrap().createOrRefreshInitialAdmin(users, encoder, gate, environment,
                "legacy-admin", "legacy-password-123", "jdbc:mysql://localhost:3306/stockwise_demo")
                .run(new String[0]);

        verify(users).save(argThat(created -> created.getUsername().equals(username)
                && created.getRole() == AppRole.ADMIN && created.isEnabled()
                && encoder.matches(password, created.getPasswordHash())));
        verify(users, never()).findByUsername("legacy-admin");
        Assertions.assertTrue(gate.isReady());
    }

    @Test
    void demoBootstrapRejectsAnyDatasourceOtherThanDemoBeforeLookingUpUser() {
        AppUserRepository users = mock(AppUserRepository.class);
        StandardEnvironment environment = new StandardEnvironment();
        environment.setActiveProfiles("demo");
        environment.getPropertySources().addFirst(new MapPropertySource("demo-admin-test", Map.of(
                "STOCKWISE_DEMO_ADMIN_USERNAME", "demo-admin",
                "STOCKWISE_DEMO_ADMIN_PASSWORD", "StockWiseAdmin2026!")));
        var runner = new AdminUserBootstrap().createOrRefreshInitialAdmin(users,
                new BCryptPasswordEncoder(12), new AdminBootstrapGate(), environment, "admin", "generic-password-123",
                "jdbc:mysql://localhost:3306/stockwise_db");

        Assertions.assertThrows(IllegalStateException.class, () -> runner.run(new String[0]));
        verifyNoInteractions(users);
    }

    @Test
    void loginWaitsUntilAdminBootstrapCompletes() {
        AppUserRepository users = mock(AppUserRepository.class);
        AdminBootstrapGate gate = new AdminBootstrapGate();
        var response = new AuthController(users, new BCryptPasswordEncoder(12), gate).login(
                new AuthController.LoginRequest("demo-admin", "StockWiseAdmin2026!"),
                new MockHttpServletRequest(), new MockHttpServletResponse());

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        verifyNoInteractions(users);
    }

    private void setEnabled(AppUser user, boolean enabled) throws Exception {
        var field = AppUser.class.getDeclaredField("enabled");
        field.setAccessible(true);
        field.setBoolean(user, enabled);
    }
}
