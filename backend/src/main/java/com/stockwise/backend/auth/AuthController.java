
package com.stockwise.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AdminBootstrapGate adminBootstrapGate;

    private final HttpSessionSecurityContextRepository securityContextRepository =
            new HttpSessionSecurityContextRepository();

    public AuthController(
            AppUserRepository users,
            PasswordEncoder passwordEncoder,
            AdminBootstrapGate adminBootstrapGate) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.adminBootstrapGate = adminBootstrapGate;
    }

    public record LoginRequest(
            @NotBlank @Size(max = 80) String username,
            @NotBlank @Size(max = 200) String password) {
    }

    public record RegisterRequest(
            @NotBlank @Size(max = 80) String username,
            @NotBlank @Size(min = 12, max = 200) String password) {
    }

    // PUBLIC REGISTRATION
    @PostMapping("/register")
    public ResponseEntity<?> register(
            @Valid @RequestBody RegisterRequest body) {

        String username = body.username().trim();

        if (users.existsByUsername(username)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Username already exists"));
        }

        AppUser newUser = new AppUser(
                username,
                passwordEncoder.encode(body.password()),
                AppRole.USER
        );

        users.save(newUser);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of(
                        "message", "Account created successfully",
                        "username", username,
                        "role", "USER"
                ));
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken());
    }

    // LOGIN
    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest body,
            HttpServletRequest request,
            HttpServletResponse response) {

        if (!adminBootstrapGate.isReady()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("message", "Admin account initialization is not complete"));
        }

        var account = users.findByUsername(body.username().trim());

        if (account.isEmpty()
                || !account.get().isEnabled()
                || !passwordEncoder.matches(
                        body.password(),
                        account.get().getPasswordHash())) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid username or password"));
        }

        AppUser appUser = account.get();

        String role = appUser.getRole().name();

        var authorities = java.util.List.of(
                new SimpleGrantedAuthority("ROLE_" + role));

        var principal = User.withUsername(appUser.getUsername())
                .password(appUser.getPasswordHash())
                .authorities(authorities)
                .build();

        Authentication authentication =
                org.springframework.security.authentication.UsernamePasswordAuthenticationToken
                        .authenticated(principal, null, authorities);

        SecurityContext context =
                SecurityContextHolder.createEmptyContext();

        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        request.getSession(true);
        securityContextRepository.saveContext(context, request, response);

        return ResponseEntity.ok(Map.of(
                "username", appUser.getUsername(),
                "role", role
        ));
    }

    // CURRENT USER
    @GetMapping("/me")
    public Map<String, String> me(Authentication auth) {

        String role = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))
                ? "ADMIN" : "USER";

        return Map.of(
                "username", auth.getName(),
                "role", role
        );
    }

    // LOGOUT
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication auth) {

        new SecurityContextLogoutHandler()
                .logout(request, response, auth);

        return ResponseEntity.noContent().build();
    }
}
