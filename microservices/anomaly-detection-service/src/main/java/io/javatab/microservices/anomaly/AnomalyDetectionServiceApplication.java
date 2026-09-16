package io.javatab.microservices.anomaly;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AnomalyDetectionServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(AnomalyDetectionServiceApplication.class, args);
	}
}
