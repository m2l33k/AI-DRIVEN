package io.javatab.microservices.tracing;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DistributedTracingServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(DistributedTracingServiceApplication.class, args);
	}

}
