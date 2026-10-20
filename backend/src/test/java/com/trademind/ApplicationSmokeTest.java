package com.trademind;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;
import java.util.Map;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:ci;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "ai.service.url=http://127.0.0.1:9",
    "jwt.secret=TradeMindIntegrationTestSecretAtLeast32BytesLong"
})
@ActiveProfiles("dev")
class ApplicationSmokeTest {
    @Autowired TestRestTemplate client;

    @Test
    void registrationLoginAndAuthenticatedDashboardWork() {
        assertThat(client.getForEntity("/actuator/health", Map.class).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(client.getForEntity("/api/stocks", String.class).getStatusCode().is4xxClientError()).isTrue();
        String email = "ci-" + UUID.randomUUID() + "@example.test";
        var registration = client.postForEntity("/api/auth/register",
            Map.of("name", "CI Trader", "email", email, "password", "LocalTestPassword123!"), Map.class);
        assertThat(registration.getStatusCode()).isEqualTo(HttpStatus.OK);
        var login = client.postForEntity("/api/auth/login",
            Map.of("email", email, "password", "LocalTestPassword123!"), Map.class);
        assertThat(login.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(((Number) login.getBody().get("balance")).doubleValue()).isEqualTo(1000000.0);
        var headers = new HttpHeaders();
        headers.setBearerAuth(login.getBody().get("token").toString());
        var request = new HttpEntity<Void>(headers);
        var stocks = client.exchange("/api/stocks", HttpMethod.GET, request, Map[].class);
        assertThat(stocks.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(stocks.getBody()).hasSize(8);
        var summary = client.exchange("/api/portfolio/summary", HttpMethod.GET, request, Map.class);
        assertThat(summary.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(((Number) summary.getBody().get("balance")).doubleValue()).isEqualTo(1000000.0);
        var leaders = client.exchange("/api/leaderboard", HttpMethod.GET, request, Map[].class);
        assertThat(leaders.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(leaders.getBody()).anySatisfy(row -> assertThat(row.get("name")).isEqualTo("CI Trader"));
    }
}
