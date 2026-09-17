---
type: concept
---

# State Management

This project uses [Pinia](https://pinia.vuejs.org/) for centralized state management in the `frontend` application.

## Store: `lottoStore`

The `useLottoStore` handles the state for lottery results and predictions.

### State

| Field | Type | Description |
| :--- | :--- | :--- |
| `results` | `Array` | List of past lottery draw results. |
| `predictions` | `Array` | List of user predictions. |
| `loading` | `Boolean` | Loading indicator for API requests. |
| `error` | `Any` | Error object if an API request fails. |

### Actions

- `fetchResults()`: Fetches results from the backend and updates `results` state.
- `fetchPredictions()`: Fetches predictions from the backend, enforces a 20-item limit, persists to `localStorage`, and updates `predictions` state.
- `updatePredictions(newPrediction)`: Adds a new prediction, enforces a 20-item limit (FIFO), and persists to `localStorage`.
- `loadFromLocalStorage()`: Loads predictions from `localStorage` on application initialization.

### Getters

- `latestResult`: Returns the newest draw result.
- `activePrediction`: Returns the newest, active prediction.
