package com.stockwise.backend;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.springframework.boot.autoconfigure.SpringBootApplication;

class BackendApplicationTests {

	@Test
	void applicationEntryPointIsAnnotatedWithoutStartingTheDatabaseBackedApplication() {
		assertTrue(BackendApplication.class.isAnnotationPresent(SpringBootApplication.class));
	}

}
