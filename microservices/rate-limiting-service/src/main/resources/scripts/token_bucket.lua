-- Atomic token-bucket rate limiter.
-- KEYS[1] = bucket key (e.g. rl:imsi:222019569249972)
-- ARGV: capacity, refillTokens, refillIntervalMs, nowMs, requested
-- Returns: { allowed(1/0), remainingTokens, retryAfterMs }
local key       = KEYS[1]
local capacity  = tonumber(ARGV[1])
local refill    = tonumber(ARGV[2])
local intervalMs= tonumber(ARGV[3])
local now       = tonumber(ARGV[4])
local requested = tonumber(ARGV[5])

local data = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(data[1])
local ts = tonumber(data[2])
if tokens == nil then
  tokens = capacity
  ts = now
end

-- Refill based on elapsed time since last touch.
local elapsed = now - ts
if elapsed < 0 then elapsed = 0 end
tokens = math.min(capacity, tokens + (elapsed / intervalMs) * refill)
ts = now

local allowed = 0
local retryAfter = 0
if tokens >= requested then
  tokens = tokens - requested
  allowed = 1
else
  local deficit = requested - tokens
  retryAfter = math.ceil(deficit / refill * intervalMs)
end

redis.call('HSET', key, 'tokens', tokens, 'ts', ts)
-- Keep Redis tidy: expire once the bucket would be fully refilled.
local ttlMs = math.ceil(capacity / refill * intervalMs) + intervalMs
redis.call('PEXPIRE', key, ttlMs)

return { allowed, math.floor(tokens), retryAfter }
