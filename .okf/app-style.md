---
type: style
---

# Frontend Style and Component Architecture

This document outlines the design language and component structure for the project's frontend, designed to maintain a consistent, hand-drawn aesthetic.

## Design Philosophy

The application employs a "sketch-like" or "analog" aesthetic, characterized by bold black borders, hard shadows, and specific earthy/retro color tones. This distinguishes the UI from flat, standard enterprise designs.

## Color Palette

The project relies on a specific set of CSS hex codes:

| Usage | Hex Code |
| :--- | :--- |
| **Main Background** | `#F3EDE2` |
| **Component Background** | `#FAF6F0` |
| **Input/Accent Background**| `#E6DFD3` |
| **Border / Text** | `#111111` |
| **Interaction / Highlight**| `#FAFFA0` |
| **Warning / Alert** | `#E75A24` |

## Tailwind CSS Conventions

To maintain visual consistency, follow these patterns for UI elements:

### Borders and Shapes
*   **Border:** Use `border-[1.5px] border-[#111111]` for consistent component borders.
*   **Corners:** Use explicit rounding classes like `rounded-full`, `rounded-xl`, `rounded-[20px]`, or `rounded-[32px]` depending on the element type.

### Shadows and Interactivity
*   **Standard Component Shadow:** Use hard, non-blurry shadows to create depth, e.g., `shadow-[2px_2px_0_0_#111111]`.
*   **Interaction Feedback:** Apply the following to clickable buttons to provide tactile feedback:
    ```tailwindcss
    active:translate-x-[1px] active:translate-y-[1px] active:shadow-none
    ```

### Header Action Buttons
When adding actionable buttons (like navigation or settings) to the `ChatView` header:
*   Ensure they match the container size (e.g., `h-10 w-10`).
*   Follow the interaction feedback pattern (active translate/shadow removal) for tactile feel.
*   Use standard border and background colors consistent with other header elements to maintain visual harmony.

## Component Architecture

The frontend is built using Vue 3 with the Composition API (`script setup`).

### Orchestration
*   **`ChatView.vue`**: Acts as the main application orchestrator. It manages the chat state, session history (via `Dexie`), and rendering of messages. It hosts sub-components.
*   **Sub-components**:
    *   `SideMenu.vue`: Manages conversation history navigation and new chat initiation.
    *   `UserConfigDialog.vue`: Handles user-specific configurations.
    *   `SettingsDialog.vue`: Manages AI model and provider configurations.

### Data Flow
- **Local DB:** Data is persisted locally using `Dexie.js` (`db.js`).
- **Communication:** `ChatView` manages the connection to the backend for streaming responses, updating local `Dexie` stores and the UI state simultaneously.
