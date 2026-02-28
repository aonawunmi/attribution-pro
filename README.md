# Attribution Pro — Investment Performance Appraisal System

A comprehensive React-based investment performance appraisal tool combining **performance measurement** (Modified Dietz) and **performance attribution** (Brinson-Fachler) in a unified dashboard.

## Features

### Performance Measurement (Modified Dietz)
- One-period Modified Dietz return calculation with cashflow weighting
- CSV upload for assets and transactions (with flexible column auto-mapping)
- Per-asset and portfolio-level returns with ACT/365 annualization
- Time-weighted cashflow display with Modified Dietz weights
- Contribution analysis (weight x return)

### Performance Attribution (Brinson-Fachler)
- Allocation, selection, and interaction effect decomposition
- Interactive data input table with real-time calculations
- Import portfolio weights/returns directly from the Performance module
- Bar charts showing effects by asset class and total active summary

### AI-Powered Analysis (Gemini)
- Executive summary generation for client reports
- Strategic recommendations for portfolio managers
- Available across both Performance and Attribution modules

## Tech Stack

- **React 18** + **Vite** — fast build tooling
- **Tailwind CSS v4** — utility-first styling
- **Recharts** — data visualizations
- **React Router v6** — client-side routing
- **Zustand** — lightweight global state management
- **PapaParse** — robust CSV parsing
- **lucide-react** — icons
- **date-fns** — date utilities

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Gemini AI Setup (Optional)

1. Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Copy `.env.example` to `.env`
3. Add your key: `VITE_GEMINI_API_KEY=your_key_here`

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Route-level page components
├── services/       # External API integrations (Gemini)
├── store/          # Zustand state management
└── utils/          # Pure calculation functions & helpers
```

## Methodologies

### Modified Dietz
```
R = (EV - BV - ΣCF) / (BV + Σ(w_i × CF_i))
w_i = (T1 - Ti) / (T1 - T0)
```

### Brinson-Fachler
```
Allocation  = (Wp - Wb) × (Rb - Rb_total)
Selection   = Wb × (Rp - Rb)
Interaction = (Wp - Wb) × (Rp - Rb)
```

### Annualization (ACT/365)
```
Annualized = (1 + R)^(365/days) - 1
```

## Validation

Math validation tests are included. Run with:
```bash
node test-validation.mjs
```

All 23 test cases validate Modified Dietz, Brinson-Fachler, annualization, and cashflow weight calculations.
