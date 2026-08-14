---
type: concept
---

# Results Schema

This document defines the schema for raw draw history data used in predictions and analysis.

## Structure

The `rawDrawHistory` dataset consists of an array of objects, where each object represents a single draw result:

| Field | Type | Description |
| :--- | :--- | :--- |
| `date` | `String` | The date of the draw (YYYY-MM-DD). |
| `numbers` | `Array<Number>` | The winning numbers. |
