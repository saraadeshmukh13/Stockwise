package com.stockwise.backend.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {
    private final AppUserRepository users;
    private final PasswordEncoder encoder;
    public AdminUserController(AppUserRepository users, PasswordEncoder encoder) { this.users = users; this.encoder = encoder; }

    public record CreateUserRequest(
        @NotBlank @Size(max=80) @Pattern(regexp="[A-Za-z0-9._-]+") String username,
        @NotBlank @Size(min=12,max=200) String password,
        AppRole role
    ) {}
    public record UserView(Long id, String username, String role, boolean enabled) {}

    @GetMapping public List<UserView> listUsers() {
        return users.findAll().stream().map(u -> new UserView(u.getId(), u.getUsername(), u.getRole().name(), u.isEnabled())).toList();
    }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public UserView createUser(@Valid @RequestBody CreateUserRequest body) {
        if (users.existsByUsername(body.username())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        AppRole role = body.role() == null ? AppRole.USER : body.role();
        AppUser saved = users.save(new AppUser(body.username(), encoder.encode(body.password()), role));
        return new UserView(saved.getId(), saved.getUsername(), saved.getRole().name(), saved.isEnabled());
    }
}
