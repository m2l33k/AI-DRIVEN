# scripts/

Helper scripts for the platform.

## `5GC.sh` — run the real 5G Core (free5GC) with the other containers

Brings up the open-source **free5GC** core (NFs: NRF/AMF/SMF/UPF/AUSF/UDM/UDR/PCF/NSSF) plus
**MongoDB**, the **WebConsole**, and (optionally) **UERANSIM**, from the upstream
[`free5gc-compose`](https://github.com/free5gc/free5gc-compose) project. free5GC is a **separate
runtime** that this Spring/Angular platform (the "harness") observes, hardens and tests — see
[`../Noted/architecture-physique/`](../Noted/architecture-physique/) and `memory/5GC-Core.md`.

> ⚠️ **Linux only.** free5GC's UPF needs the out-of-tree **`gtp5g`** kernel module, so run this on
> **Ubuntu 22.04 (VM)** or **WSL2** with a `gtp5g`-built kernel — not on bare Windows/macOS Docker.

### Usage
```bash
./scripts/5GC.sh doctor      # preflight: OS, docker, gtp5g module, repo present
./scripts/5GC.sh up          # start free5GC alone (clones free5gc-compose on first run)
./scripts/5GC.sh compose     # ★ Option A: free5GC + platform infra as ONE stack, ONE network
./scripts/5GC.sh all         # free5GC AND the harness infra as TWO separate stacks
./scripts/5GC.sh ueransim    # start the UERANSIM gNB/UE profile
./scripts/5GC.sh status      # container status
./scripts/5GC.sh logs amf    # follow a NF's logs (amf/smf/upf/...)
./scripts/5GC.sh down        # stop & remove (add -v to also wipe volumes/subscriber data)
./scripts/5GC.sh urls        # print WebConsole / NRF / MongoDB endpoints
```

### Option A — one integrated stack (recommended)
`./scripts/5GC.sh compose` runs **`docker/docker-compose-5gc.yml`** together with the platform's
infra + observability compose files in a **single `docker compose` project**, so the free5GC NFs
join the same **`shared-network`** as Keycloak / Prometheus / the gateway. That lets the harness
reach the core directly (gateway → NRF, Prometheus → NF metrics, Fluent Bit → NF logs).

- The free5GC services also sit on a private subnet **`privnet` (10.100.200.0/24)** with **static
  IPs** — required because the NF config files reference fixed addresses and the UPF GTP-U path
  needs a stable IP.
- **NF config + certs are NOT re-authored** in this repo — they are **mounted from your cloned
  `free5gc-compose`** (`F5GC_DIR`, default `../free5gc-compose`), so upstream owns those files.
- Manage it with passthrough subcommands:
  ```bash
  ./scripts/5GC.sh compose            # up -d
  ./scripts/5GC.sh compose ps
  ./scripts/5GC.sh compose logs amf
  ./scripts/5GC.sh compose down       # add -v to wipe volumes
  ```
- Image tag is pinned via `F5GC_TAG` (default `v3.4.4`) — **match it to your `gtp5g` version**.

### Configuration (env overrides)
| Variable | Default | Purpose |
|---|---|---|
| `FREE5GC_DIR` | `../free5gc-compose` (sibling of the repo) | Clone location; also the source of `config/` + `cert/` mounted by `docker-compose-5gc.yml` (via `F5GC_DIR`) |
| `FREE5GC_REPO` | `https://github.com/free5gc/free5gc-compose.git` | Upstream repo to clone |
| `FREE5GC_REF` | *(repo default)* | Git tag/branch to check out (pin a version matching your `gtp5g`) |
| `F5GC_TAG` | `v3.4.4` | free5GC image tag used by the integrated `compose` stack — match your `gtp5g` |

### First-run checklist
1. Build & load `gtp5g` against your running kernel, then `sudo modprobe gtp5g` (`lsmod | grep gtp5g`).
2. `./scripts/5GC.sh up` — clones `free5gc-compose` and starts the core.
3. Open the **WebConsole** (http://localhost:5000, `admin`/`free5gc`) and provision a subscriber
   (IMSI, key/OPc, S-NSSAI, DNN).
4. `./scripts/5GC.sh ueransim` and confirm a clean **Initial Registration** + **PDU session**.

> `free5gc-compose` is kept as a **sibling folder**, not inside this Maven build — the two are
> separate runtimes; the harness only consumes free5GC's APIs / metrics / logs.
