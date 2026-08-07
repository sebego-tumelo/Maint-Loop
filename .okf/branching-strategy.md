---
type: concept
---

# Branching Strategy: Backend & OKF Separation

To isolate development of backend features and documentation updates, a dedicated branch `feature/backend-and-okf` has been created.

- **Purpose**: To allow independent development and testing of backend and `.okf` updates without disrupting the main production branch.
- **Workflow**: All backend-specific features and documentation updates should be committed to this branch.
- **Deployment**: This branch can be linked to a separate Render service or used for staging deployments.
