package io.javatab.microservices.ratelimit.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.scripting.support.ResourceScriptSource;

import java.util.List;

/**
 * Loads the atomic token-bucket Lua script as a {@link RedisScript} so a rate-limit decision is a
 * single round-trip (no read-modify-write race across instances).
 */
@Configuration
public class RedisConfig {

	@Bean
	@SuppressWarnings({"unchecked", "rawtypes"})
	public RedisScript<List> tokenBucketScript() {
		DefaultRedisScript script = new DefaultRedisScript();
		script.setScriptSource(new ResourceScriptSource(new ClassPathResource("scripts/token_bucket.lua")));
		script.setResultType(List.class);
		return script;
	}
}
