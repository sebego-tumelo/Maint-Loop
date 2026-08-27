# SA Daily Lotto 5/36 - AI Prediction & Financial Ledger

A modern, responsive web application for South Africa Daily Lotto (5/36) enthusiasts. The app combines frequency analysis, predictive heuristics, draw simulations, official prize rolldown calculations, and a comprehensive financial ROI ledger—all wrapped in a clean, warm pastel user interface.

---

## 🌟 Features

- **Algorithmic Candidate Generator**:
  - Predict combinations based on Hot Frequency, Cold Due Numbers, Delta Dispersion, and Balanced Odd/Even Parity heuristics.
  - Multi-board allocation support (1 to 5 boards per draw, default: 3 boards @ R3 each = R9).
  - Single-board re-roll capabilities and algorithmic synergy ratings.

- **Financial Ledger & ROI Tracker**:
  - 4-quadrant financial summary: Current Draw Stake, Total Invested, Lifetime Won, and Net Yield / ROI.
  - Dynamic local state persistence via `localStorage` to retain draw and bet histories across sessions.

- **Chamber Draw Simulator**:
  - Mechanical draw simulation matching official South African 21:00 SAST lottery rules.
  - Automatic ticket validation and prize breakdown evaluation according to official division shares (Match 2, 3, 4, and 5 Jackpots with rolldown mechanics).

- **Historical Archives & Logs**:
  - Searchable, sortable list of past official draws and prediction performance records.
  - Interactive weekly date bar with live countdown timer to the 21:00 SAST daily draw.

- **Warm Editorial Aesthetic**:
  - Soft pastel palette (peach, mint, lavender, and butterscotch accents) designed with responsive desktop and mobile-first ergonomics.

---

## 🛠️ Technologies Used

- **Framework**: [Vue.js 3](https://vuejs.org/) (Composition API, `<script setup>`)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide Vue Next](https://lucide.dev/)
- **Visual FX**: [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)
- **Language**: TypeScript & Modern ES Modules

---

## 🚀 Getting Started & Installation

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (version 18 or higher) and `npm` installed.

### 1. Clone the Repository

```bash
git clone <repository-url>
cd daily-lotto-vue
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

Run the local development server:

```bash
npm run dev
```

The application will be accessible at: `http://localhost:3000` (or the port specified by your environment).

---

## 📖 How to Use

1. **Review Latest Results**: Check the top banner for the most recent official 5-ball winning combination and prize pool estimates.
2. **Generate Prediction**:
   - Click the **"Generate"** or **"Generate New Prediction"** button.
   - Choose your board count (default is 3 boards = R9) and heuristic model (e.g., *Dynamic Synergy*, *Hot Decades*, or *Cold Value*).
   - Review your candidate numbers, reroll individual boards if desired, and click **"Accept Candidates"**.
3. **Simulate a Draw**:
   - Click the **"Simulate Draw"** button in the header.
   - Press **"🎲 Spin & Extract 5 Balls"** to run the random mechanical ball extraction.
   - Click **"Apply to Ledger"** to evaluate your active boards against the winning numbers, calculate prize payouts, and record the session in your financial ledger.
4. **Monitor ROI & Ledger**:
   - Track your cumulative spend, lifetime winnings, win rate, and net profit percentage in the 4-quadrant ledger grid.
   - Switch between **"Draw Archive"** and **"Prediction Log"** tabs in the historical records section.

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server on port 3000 |
| `npm run build` | Compiles and bundles production-ready static assets in `dist/` |
| `npm run preview` | Previews the production build locally |
| `npm run lint` | Validates syntax and builds in development mode |

---

## ⚖️ Disclaimer

This application is an educational, statistical analysis, and simulation tool. It is not affiliated with the South African National Lottery or ITHUBA Holdings. Lottery games are games of chance; please play responsibly.
