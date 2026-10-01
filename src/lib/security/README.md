# Security
State-changing browser API requests are origin-checked by middleware and API traffic is rate-limited. If Upstash REST variables are configured, rate limiting is distributed across Vercel instances; otherwise a bounded in-process fallback is used. Webhooks are separately authenticated by their provider secret/signature.
