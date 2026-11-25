
package com.stockwise.backend.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Optional;

@Configuration
public class AdminUserBootstrap {
    private static final Logger log = LoggerFactory.getLogger(AdminUserBootstrap.class);

    @Bean
    CommandLineRunner createOrRefreshInitialAdmin(
            AppUserRepository users,
            PasswordEncoder encoder,
            AdminBootstrapGate gate,
            Environment environment,
            @Value("${stockwise.admin.username:}") String username,
            @Value("${stockwise.admin.password:}") String password,
            @Value("${spring.datasource.url:}") String datasourceUrl) {

        return args -> {
            gate.markNotReady();
            boolean demoProfile = environment.acceptsProfiles(Profiles.of("demo"));
            // In demo, read the dedicated variables directly so legacy STOCKWISE_ADMIN_*
            // variables cannot override the profile's demo account.
            String configuredUsername = demoProfile
                    ? environment.getProperty("STOCKWISE_DEMO_ADMIN_USERNAME", "") : username;
            String configuredPassword = demoProfile
                    ? environment.getProperty("STOCKWISE_DEMO_ADMIN_PASSWORD", "") : password;
            String normalizedUsername = configuredUsername == null ? "" : configuredUsername.trim();
            log.info("Admin bootstrap starting (usernameConfigured={}, demoProfile={})",
                    !normalizedUsername.isBlank(), demoProfile);

            if (normalizedUsername.isBlank()
                    || configuredPassword == null || configuredPassword.isBlank()) {
                throw new IllegalStateException(
                    "Set the configured StockWise admin username and password before starting StockWise."
                );
            }

            if (configuredPassword.length() < 12) {
                throw new IllegalStateException(
                    "Admin password must contain at least 12 characters."
                );
            }

            if (demoProfile && (!"demo-admin".equals(normalizedUsername)
                    || !"stockwise_demo".equals(databaseName(datasourceUrl)))) {
                throw new IllegalStateException(
                        "Demo admin bootstrap requires username demo-admin and datasource database stockwise_demo."
                );
            }

            Optional<AppUser> existing = users.findByUsername(normalizedUsername);
            boolean created = existing.isEmpty();
            String passwordHash = encoder.encode(configuredPassword);
            AppUser admin = existing.orElseGet(() ->
                    new AppUser(normalizedUsername, passwordHash, AppRole.ADMIN));
            admin.updateAdminCredentials(passwordHash);

            users.save(admin);
            log.info("Admin bootstrap {} account (enabled={}, role={})",
                    created ? "created" : "updated", admin.isEnabled(), admin.getRole());
            gate.markReady();
        };
    }

    private String databaseName(String jdbcUrl) {
        if (jdbcUrl == null) return "";
        int slash = jdbcUrl.lastIndexOf('/');
        if (slash < 0 || slash == jdbcUrl.length() - 1) return "";
        String databaseAndOptions = jdbcUrl.substring(slash + 1);
        int query = databaseAndOptions.indexOf('?');
        return query < 0 ? databaseAndOptions : databaseAndOptions.substring(0, query);
    }
}
