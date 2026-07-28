---
type: concept
---

# Development Environment Configuration

## Vite & GitHub Codespaces

When running the Vite development server within a GitHub Codespaces environment, it is necessary to allow traffic from the Codespaces proxy. 

This is configured in `frontend/vite.config.js` using the `server.allowedHosts: true` setting. Without this, the Codespaces proxy may return a 404 error when trying to access the development server from an external URL.
