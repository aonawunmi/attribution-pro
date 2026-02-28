/**
 * Central state store for the Investment Performance Appraisal System.
 *
 * Uses Zustand for lightweight, hook-based global state.
 * Holds portfolio data, cashflows, dates, and computed results
 * that are shared across the Performance Measurement and Attribution modules.
 */

import { create } from 'zustand';

const usePortfolioStore = create((set, get) => ({
  // ── Period ──────────────────────────────────────────────────
  startDate: null, // Date object
  endDate: null,   // Date object

  setDates: (startDate, endDate) => set({ startDate, endDate }),

  // ── Assets ──────────────────────────────────────────────────
  // Array of { name, beginningValue, endingValue }
  assets: [],

  setAssets: (assets) => set({ assets }),

  addAsset: (asset) =>
    set((state) => ({ assets: [...state.assets, asset] })),

  updateAsset: (index, updates) =>
    set((state) => ({
      assets: state.assets.map((a, i) => (i === index ? { ...a, ...updates } : a)),
    })),

  removeAsset: (index) =>
    set((state) => ({
      assets: state.assets.filter((_, i) => i !== index),
    })),

  // ── Cashflows ───────────────────────────────────────────────
  // Array of { date, amount (signed), assetClass, details, type, rawAmount }
  cashflows: [],

  setCashflows: (cashflows) => set({ cashflows }),

  // ── Performance Results (computed) ──────────────────────────
  // Populated after running Modified Dietz calculations
  performanceResults: null, // { assetResults, portfolio, issues }

  setPerformanceResults: (results) => set({ performanceResults: results }),

  // ── Saved Periods (for multi-period report) ────────────────
  periods: [],

  savePeriodSnapshot: () => {
    const { startDate, endDate, assets, cashflows, performanceResults } = get();
    if (!performanceResults || !startDate || !endDate) return;

    const id = `${startDate.getTime()}_${endDate.getTime()}`;
    const label = `${startDate.toLocaleDateString()} – ${endDate.toLocaleDateString()}`;

    const snapshot = {
      id,
      label,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      assets: assets.map((a) => ({ ...a })),
      cashflows: cashflows.map((c) => ({ ...c })),
      performanceResults: JSON.parse(JSON.stringify(performanceResults)),
      savedAt: new Date(),
    };

    set((state) => ({
      periods: [...state.periods.filter((p) => p.id !== id), snapshot],
    }));
  },

  removePeriod: (id) =>
    set((state) => ({
      periods: state.periods.filter((p) => p.id !== id),
    })),

  clearPeriods: () => set({ periods: [] }),

  // ── Helper: convert performance results to attribution inputs ──
  getPerformanceAsAttributionInput: () => {
    const { performanceResults } = get();
    if (!performanceResults || !performanceResults.assetResults) return null;

    return performanceResults.assetResults.map((a) => ({
      name: a.name,
      portfolioWeight: a.weight,
      portfolioReturn: a.periodReturn,
      benchmarkWeight: 0,
      benchmarkReturn: 0,
    }));
  },

  // ── Reset ───────────────────────────────────────────────────
  resetAll: () =>
    set({
      startDate: null,
      endDate: null,
      assets: [],
      cashflows: [],
      performanceResults: null,
    }),
}));

export default usePortfolioStore;
