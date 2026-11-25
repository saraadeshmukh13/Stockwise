# MySQL integration tests

The MySQL integration suite is opt-in and uses a disposable Testcontainers database. It does not use the configured `stockwise_db` datasource.

## Requirements

- Docker Desktop or another Docker-compatible daemon must be running and available to Testcontainers.
- The integration image is pinned to `mysql:8.4.7` in `StockWiseMySqlIT`.
- Maven must be able to resolve the test dependencies on the first run.

## Run tests

Run the database-free unit tests without Docker:

```sh
mvn test
```

Run only the MySQL integration-test group (ordinary Surefire tests are skipped in this profile):

```sh
mvn -Pmysql-integration verify
```

The `*IT` naming convention keeps the integration class out of ordinary Surefire runs. The explicit profile invokes Maven Failsafe. If Docker is unavailable or the container cannot start, this profile fails; it does not skip the tests or fall back to a local database.

## Isolation controls

- The test profile has an unreachable `127.0.0.1:1/stockwise_test` fallback. Testcontainers must override it.
- A context initializer rejects any datasource URL, username, or password that does not exactly match the running test container, and rejects any URL whose database is not `stockwise_test`. This runs before Hibernate initializes.
- Before each test method performs database work, it queries `SELECT DATABASE()` and requires the result to equal `stockwise_test`.
- `legacy-products.sql` is passed only to `MySQLContainer.withInitScript`; it runs inside the newly created container before the Spring test context and Hibernate start.
- The container has no host data volume and is stopped after the integration-test class. Production datasource properties and credentials are not changed.

The database-free and MySQL integration results should be reported separately. Do not run integration tests against a developer's shared/local MySQL server.
