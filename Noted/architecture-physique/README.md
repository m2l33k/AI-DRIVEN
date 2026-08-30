# Architecture Physique — Plateforme Nexo

Vue **physique** du déploiement : machines physiques/virtuelles, moteur Docker, réseaux,
ports exposés et ressources hôtes. Elle complète la vue **logique** (`Noted/diagram/`) en
montrant *sur quel matériel* chaque composant s'exécute réellement.

## Fichier

| Fichier | Contenu |
|---------|---------|
| [`architecture-physique.puml`](architecture-physique.puml) | Diagramme d'architecture physique complet (postes, VM Linux, conteneurs, réseau) |

## Les trois nœuds physiques

| Nœud physique | OS / ressources | Ce qui y tourne |
|---------------|-----------------|-----------------|
| **Poste de développement** | Windows 11 · 8 cœurs · 16 Go+ | JARs Spring Boot (9 services, `run.sh`), Angular (`ng serve` :4200), moteur Docker (Keycloak, bases par service, observabilité) |
| **Hôte Linux (VM / WSL2)** | Ubuntu 22.04 · noyau + module **`gtp5g`** · 16 Go / 8 cœurs | Cœur 5G réel **free5GC** (NRF/AMF/SMF/UPF/AUSF/UDM…) + **UERANSIM** + MongoDB + WebConsole, via `free5gc-compose` |
| **Poste utilisateur** | Navigateur | Console Angular + Grafana |

> **Contrainte physique déterminante :** l'UPF de free5GC nécessite le module noyau
> **`gtp5g`**, indisponible sous Docker Windows/macOS. Le cœur 5G tourne donc sur un
> **hôte Linux séparé** ; la plateforme Nexo (Java/Angular) reste sur le poste Windows et
> **consomme** les API / métriques / logs du cœur.

## Ports exposés (récapitulatif)

| Catégorie | Composant → Port |
|-----------|------------------|
| Edge | eureka `8761` · gateway `9000` |
| Services métier | auth `9001` · roaming `9002` · anomaly `9003` · rate-limiting `9004` · tracing `9005` · fault `9006` · messaging `9007` |
| Frontend | Angular `4200` |
| Identité | Keycloak `8081` (→8080) · keycloak-postgres `5437` |
| Bases (1/service) | roaming-mysql `3307` · anomaly-pg `5433` · ratelimit-pg `5434` · tracing-pg `5435` · fault-pg `5436` · messaging-pg `5438` · ratelimit-redis `6379` · anomaly-redis `6380` |
| Observabilité | prometheus `9090` · grafana `3000` · loki `3100` · tempo `4317/4318/3200` · fluent-bit `24224` |

## Rendu du diagramme

- **VS Code** — extension *PlantUML* → ouvrir le `.puml` → `Alt+D`.
- **CLI** — `plantuml -tpng Noted/architecture-physique/architecture-physique.puml`.
- **En ligne** — coller dans <https://www.plantuml.com/plantuml>.

## Voir aussi
- Vue logique / déploiement, séquences, LLD : [`Noted/diagram/`](../diagram/README.md)
- Topologie 5G Core détaillée : `memory/5GC-Core.md` (vault Obsidian)
