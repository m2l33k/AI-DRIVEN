package io.javatab.microservices.fivegc.config;

import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientImpl;
import com.github.dockerjava.httpclient5.ApacheDockerHttpClient;
import com.github.dockerjava.api.DockerClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class DockerClientConfig {

	@Value("${docker.host:npipe:////./pipe/docker_engine}")
	private String dockerHost;

	@Bean
	public DockerClient dockerClient() {
		DefaultDockerClientConfig config = DefaultDockerClientConfig.createDefaultConfigBuilder()
				.withDockerHost(dockerHost)
				.withDockerTlsVerify(false)
				.build();

		ApacheDockerHttpClient httpClient = new ApacheDockerHttpClient.Builder()
				.dockerHost(config.getDockerHost())
				.sslConfig(config.getSSLConfig())
				.connectionTimeout(Duration.ofSeconds(5))
				.responseTimeout(Duration.ofSeconds(30))
				.build();

		return DockerClientImpl.getInstance(config, httpClient);
	}
}
