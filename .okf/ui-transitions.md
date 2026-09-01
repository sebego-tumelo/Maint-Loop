---
type: ux
---

# UI Transitions and Loading States

This document outlines the conventions for UI transitions and loading states in the application to ensure a smooth, professional user experience.

## Loading Overlays

To provide feedback during data-intensive operations (like fetching initial app data), the application uses a full-screen loading overlay.

### Implementation
- **Component**: `<transition>` wrapper around a fixed overlay `div`.
- **Background**: Uses `nav-sand` (`#ffcb66`) to match the brand identity.
- **Animation**: 
  - Uses `transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);` for a fast-start, slow-end upward exit animation.
  - Target: `transform: translateY(-100%);`

### Usage Guidelines
- Trigger the overlay using the `isLoading` state from the Pinia store.
- Ensure the overlay sits above all other content (`z-50`).
- Display a clear loading indicator (like `Loader2`) and a descriptive message.
