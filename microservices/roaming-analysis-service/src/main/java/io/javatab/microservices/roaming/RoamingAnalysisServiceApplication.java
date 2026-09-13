package io.javatab.microservices.roaming;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@SpringBootApplication
@EnableScheduling
public class RoamingAnalysisServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(RoamingAnalysisServiceApplication.class, args);
	}

	@Bean
	public RestTemplate restTemplate() {
		SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
		factory.setConnectTimeout((int) Duration.ofSeconds(5).toMillis());
		factory.setReadTimeout((int) Duration.ofSeconds(30).toMillis());
		return new RestTemplate(factory);
	}
}
