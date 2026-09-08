---
type: concept
---

# Results Schema

This document defines the schema for draw result data returned by the backend API.

## Structure

The data is an array of objects, where each object represents a single draw result:

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `String` | The MongoDB document ID. |
| `drawNumber` | `Number` | The official draw issue number. |
| `date` | `String` | The date of the draw (YYYY-MM-DD). |
| `winningNumbers` | `Array<Number>` | The winning numbers (parsed as integers). |
| `prizePool` | `Number` | The estimated prize pool, scaled to Rand (divided by 100). |
| `prizeDivisions` | `Array<Object>` | Payout details, scaled to Rand (payouts divided by 100). |

## Prize Division Structure

Each object in `prizeDivisions` has the following structure:

| Field | Type | Description |
| :--- | :--- | :--- |
| `division` | `Number` | The division ID. |
| `label` | `String` | Division name (e.g., "DIV 1"). |
| `match` | `String` | Match description (e.g., "MATCH 5"). |
| `matches` | `String` | Duplicate of `match`. |
| `winners` | `Number` | Total number of winners. |
| `payout` | `Number` | Payout amount per winner, scaled to Rand. |
| `prize.amount`| `Number` | Duplicate of `payout`. |
