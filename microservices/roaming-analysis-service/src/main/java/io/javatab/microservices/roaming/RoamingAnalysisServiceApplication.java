package io.javatab.microservices.roaming;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RoamingAnalysisServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(RoamingAnalysisServiceApplication.class, args);
	}

}
