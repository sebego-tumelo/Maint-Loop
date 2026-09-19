---
type: concept
---

# Self-Learning Architecture

The system is transitioning from a static rule-based prediction engine to an active, self-optimizing feedback loop. This architecture allows the AI to learn from its performance rather than just observing it.

## Key Phases

1.  **Instrumentation (Performance Tracking)**: Quantify the success of individual scoring rules.
2.  **Parameterization (Dynamic Rules)**: Decouple rule scoring from code and move them to database-driven parameters.
3.  **Active Feedback Loop (LLM-based Optimization)**: Utilize reflection processes not just for journaling, but for updating rule parameters based on performance.
4.  **Portfolio Selection (Diversity)**: Shift from "top-n selection" to "clustered portfolio selection" to ensure strategy diversity.

## Data Schema for Learning

- `RulePerformance`: Tracks the efficacy of specific `Rule` configurations across draws.
- `Rule`: Now stores dynamic parameters (`multiplier`, `penalty`) instead of being hardcoded.
