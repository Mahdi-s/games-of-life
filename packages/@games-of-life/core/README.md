# @games-of-life/core

Framework-agnostic core building blocks for **Games of Life**.

This package is intentionally **UI-free** and **framework-free**. It provides:

- **Canonical encodings** (stable IDs → shader/kernel indices) to prevent semantic drift
- **Rule parsing/formatting** (B/S/C + neighborhood tokens)
- **Vitality utilities** (curve sampling + spec types)
- **CPU fallback stepper** (useful for mini-sims, testing, or non-WebGPU environments)
- **Seed pattern catalogs** (shared IDs + cells for UI and engines)

## Exports

- `spec`
  - `spectrumModeIds`, `brushShapeIds`, `boundaryIds`, `neighborhoodIds`
  - `spectrumModeToIndex`, `brushShapeToIndex`, `boundaryToIndex`, `neighborhoodToIndex`
- `rules`
  - `parseRuleString(rule: string)`
  - `formatRuleString(ruleSpec)`
  - `RuleSpec`
- `vitality`
  - `VitalityMode`, `VitalitySpec`, `DEFAULT_VITALITY`
  - `sampleVitalityCurve(points)` → `number[]` (128 samples)
- `cpu`
  - `stepBsGenerationsCpu(prev, next, cfg)`
  - `CpuStepConfig`
- `seeds`
  - `SEED_PATTERNS`, `SEED_PATTERNS_HEX`
  - `SeedPattern`, `SeedPatternId`
- `boundaries`
  - `BoundaryId` (alias: `BoundaryMode`)


