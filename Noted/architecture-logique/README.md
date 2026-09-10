# Architecture Logique — Plateforme Nexo

Vue **logique** de la plateforme : les **couches fonctionnelles**, les responsabilités de
chaque module et les **flux logiques** entre eux, **indépendamment du matériel**. Elle
complète la vue **physique** (`Noted/architecture-physique/`), qui montre *sur quel matériel*
chaque composant s'exécute.

## Fichier

| Fichier | Contenu |
|---------|---------|
| [`architecture-logique.puml`](architecture-logique.puml) | Diagramme en couches (présentation → passerelle/sécurité → identité → services métier → persistance → observabilité) |

## Les six couches logiques

| # | Couche | Responsabilité | Composants |
|---|--------|----------------|------------|
| 1 | **Présentation** | Interface utilisateur par rôle | Console Angular (Admin / Opérateur / Analyste / Auditeur) |
| 2 | **Passerelle & Sécurité** | Point d'entrée unique, routage, validation JWT, RBAC `PERM_*`, découverte | API Gateway, Service Registry (Eureka) |
| 3 | **Identité** | Authentification OIDC/OAuth2, rôles composites → permissions | Keycloak (`realm auth-management`, `platform-client`) |
| 4 | **Services Métier / Domaine** | Logique métier découplée, un service = un domaine | Auth, Roaming Analysis, Rate-Limiting, Messaging, Anomaly Detection, Tracing, Fault Injection, Util (lib partagée) |
| 5 | **Persistance** | Stockage isolé — **un magasin par service** | Roaming, Auth, Rate-Limit, Messaging, Anomaly/Tracing/Fault |
| 6 | **Observabilité** *(transversale)* | Métriques, journaux, traces, tableaux de bord | Prometheus, Loki, Tempo, Grafana |

## Principes logiques directeurs

- **Point d'entrée sécurisé unique** — tout `/api/**` transite par la passerelle (JWT + rate-limit) avant d'atteindre un service.
- **Autorisation par permissions `PERM_*`** — vérifiée à la passerelle **et** dans chaque service (défense en profondeur), jamais sur le simple nom de rôle.
- **Un magasin de données par service** — pas de couplage par la base ; chaque domaine possède son schéma.
- **Découplage par découverte** — les services se résolvent par nom logique via Eureka, sans hôte codé en dur.
- **Préoccupations transversales centralisées** — sécurité, découverte et observabilité résolues une fois au niveau plateforme.

> La correspondance entre ces couches logiques et les nœuds/ports réels est détaillée dans
> [`Noted/architecture-physique/`](../architecture-physique/README.md).

## Rendu du diagramme

- **VS Code** — extension *PlantUML* → ouvrir le `.puml` → `Alt+D`.
- **CLI** — `plantuml -tpng Noted/architecture-logique/architecture-logique.puml`.
- **En ligne** — coller dans <https://www.plantuml.com/plantuml>.

## Voir aussi
- Architecture **physique** : [`Noted/architecture-physique/`](../architecture-physique/README.md)
- HLD, cas d'utilisation, séquences, LLD : [`Noted/diagram/`](../diagram/README.md)
