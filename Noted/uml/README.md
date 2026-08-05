# UML Diagrams

This folder holds the architecture and design diagrams for the Auth Management System starter.

| File | Diagram | What it shows |
|------|---------|---------------|
| `component.puml` | Component | All services, Keycloak, and the observability stack with their interactions |
| `deployment.puml` | Deployment | Docker Compose topology on `shared-network` with ports |
| `class-auth-service.puml` | Class | Controllers, `KeycloakService`, config, and DTOs of auth-service |
| `sequence-login.puml` | Sequence | Login → JWT via the gateway and Keycloak password grant |
| `sequence-protected-request.puml` | Sequence | `PERM_*` RBAC enforcement on a protected call |
| `rbac-model.puml` | Class/relationship | Role → permission composite mapping |
| `diagrams.mermaid.md` | All (Mermaid) | GitHub-renderable mirror of the above |

## Rendering PlantUML

**CLI** (needs Java + Graphviz):

```bash
plantuml Noted/uml/*.puml          # produces PNGs next to each .puml
plantuml -tsvg Noted/uml/*.puml    # SVG output
```

**VS Code**: install the *PlantUML* extension and press `Alt+D` to preview.

**Online**: paste any `.puml` into https://www.plantuml.com/plantuml.

The Mermaid file (`diagrams.mermaid.md`) needs no tooling — it renders inline on GitHub.
