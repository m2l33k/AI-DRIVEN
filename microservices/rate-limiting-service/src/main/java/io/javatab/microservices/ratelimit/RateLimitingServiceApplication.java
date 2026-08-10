package io.javatab.microservices.ratelimit;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class RateLimitingServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(RateLimitingServiceApplication.class, args);
	}

}
