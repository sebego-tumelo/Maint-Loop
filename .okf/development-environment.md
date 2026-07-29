---
type: concept
---

# Development Environment Configuration

## Vite & GitHub Codespaces

When running the Vite development server within a GitHub Codespaces environment, it is necessary to allow traffic from the Codespaces proxy. 

This is configured in `frontend/vite.config.js` using the `server.allowedHosts: true` setting. 

Additionally, if you encounter CORS issues loading the PWA manifest (`manifest.webmanifest`), ensure the port (e.g., 5173) is set to **Public** in the Codespaces Ports tab. The private tunnel, which requires authentication, can interfere with browser-initiated requests for the manifest file.
