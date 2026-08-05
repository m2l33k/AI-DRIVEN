# CI/CD Workflows

GitHub Actions pipeline for the `auth-management-system` platform (Java 17 · Spring Boot
4.0.3 · Maven multi-module). The pipeline is security-first — fitting the zero-trust theme
of the project — combining build/test with SAST, dependency, secret, filesystem and
container scanning, SBOM generation, and signed image publishing.

## Files

| File | Purpose |
|------|---------|
| `ci.yml` | Main pipeline: build/test + coverage, static analysis, secret/fs/dependency scanning, per-service image build → scan → SBOM → push → sign |
| `codeql.yml` | CodeQL SAST (security-extended + quality queries), also on a weekly schedule |
| `../dependabot.yml` | Automated weekly updates for Maven, GitHub Actions, and Docker base images |

## `ci.yml` jobs

```
build-and-test ─┬─> docker (matrix: eureka / gateway / auth) ─┐
                │                                              ├─> ci-success (gate)
static-analysis │  secret-scan   trivy-fs   dependency-review ─┘
```

1. **build-and-test** — `./mvnw verify` across the reactor, JaCoCo coverage, JUnit report
   published as a check, Surefire + coverage artifacts, optional Codecov upload.
2. **static-analysis** — SpotBugs + PMD (advisory, `continue-on-error`).
3. **secret-scan** — Gitleaks over full history.
4. **trivy-fs** — vuln + secret + misconfig scan → SARIF to the Security tab.
5. **dependency-review** (PRs) — blocks high-severity or non-compliant dependencies.
6. **docker** (matrix per service) — build the layered image, Trivy scan (SARIF + a
   CRITICAL gate), generate an SPDX SBOM, and on `main`/tags push to **GHCR** and sign
   **keylessly with Cosign** (Sigstore/OIDC).
7. **ci-success** — one aggregate status to use as the branch-protection required check.

## Setup notes

- **Images** are published to `ghcr.io/<owner>/<repo>/<service>` using the built-in
  `GITHUB_TOKEN` (`packages: write`). No extra secret needed to push to GHCR.
- **Cosign** signing is keyless via OIDC (`id-token: write`) — no key management.
- **Codecov** upload is optional; set a `CODECOV_TOKEN` secret for private-repo uploads
  (the step never fails the build).
- **Branch protection**: make `CI Success` (and optionally `Analyze (java-kotlin)`) the
  required checks on `main`.
- **PRs build and scan images but never push or sign** — publishing is gated to
  `push` events on `main`/tags.

## Running the same checks locally

```bash
./mvnw -B verify                       # build + tests
trivy fs --scanners vuln,secret,misconfig .   # if trivy is installed
gitleaks detect --source .             # if gitleaks is installed
```
