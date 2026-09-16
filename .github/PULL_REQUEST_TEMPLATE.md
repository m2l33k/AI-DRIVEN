## Summary

<!-- 1-3 bullet points describing what this PR does. Be specific. -->

-
-

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that causes existing functionality to change)
- [ ] Refactor / performance improvement
- [ ] Documentation update
- [ ] CI / infrastructure

## Services affected

<!-- Check all services touched by this PR -->

- [ ] `gateway-service`
- [ ] `auth-service`
- [ ] `roaming-analysis-service`
- [ ] `anomaly-detection-service`
- [ ] `rate-limiting-service`
- [ ] `audit-service`
- [ ] `messaging-service`
- [ ] `fivegc-service`
- [ ] `eureka-server`
- [ ] `ml-service`
- [ ] `Frontend` (Angular)
- [ ] `docker/` (infra compose)
- [ ] `CI/CD` (.github/workflows)

## Test plan

<!-- How was this tested? Check all that apply. -->

- [ ] Existing unit tests pass (`mvn test`)
- [ ] New unit tests added (describe below)
- [ ] Manually tested locally — describe what was verified:

```
# commands run / screenshots taken
```

## Breaking changes / migration notes

<!-- Any breaking API changes, DB migrations, config renames, or Docker changes? -->

None / describe here.

## Checklist

- [ ] CI passes (all green checks)
- [ ] No new CRITICAL/HIGH security findings in Trivy scan
- [ ] `audit-service` is not in root pom.xml? (already fixed — just confirming)
- [ ] New endpoints are gated by appropriate `@PreAuthorize`
- [ ] No secrets or credentials committed
