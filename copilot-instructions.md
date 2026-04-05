# Cargo Vision AI: Copilot Focus Instructions

## Mission
Build a winning customs-security prototype that detects suspicious, misdeclared, concealed, and prohibited cargo from X-ray style images, with clear risk explanations for analysts.

## Non-Negotiable Priorities
1. Optimize all work for jury criteria: relevance, technical soundness, detection quality, explainability, and demo quality.
2. Tie every implementation choice to customs/border use cases.
3. Prefer measurable progress over broad feature sprawl.
4. Keep outputs practical for a hackathon timeline.

## Scope Guardrails
1. Work only on approved modules in PROJECT_MODULE_TRACKER.md.
2. Do not introduce unrelated features, refactors, or UI rewrites unless they directly improve scoring criteria.
3. Do not propose architecture changes without a clear impact on accuracy, recall, precision, latency, or explainability.
4. Keep each iteration small, testable, and demo-ready.

## Implementation Behavior
1. Start each task by stating: module, objective, expected metric impact.
2. For model tasks, always define:
- dataset
- labels/classes
- training split
- baseline metric
- target metric
3. For inference integration, always provide:
- API contract changes
- risk score impact
- fallback behavior
4. For dashboard changes, prioritize analyst decisions over aesthetics.

## Module Completion Standard
A module is complete only when all are true:
1. Trained model or deterministic logic is integrated.
2. Output appears in the app/API.
3. Risk contribution is visible in final risk breakdown.
4. At least one measurable validation result is documented.
5. Demo scenario exists for that module.

## Preferred Build Order
1. M1 Visual Inspection and prohibited object detection hardening.
2. M2 Density Difference upgrade (from proxy to stronger material modeling).
3. M5 Big Cargo mismatch checks (count audit + density-volume consistency).
4. M3 Manifest NLP and declaration intelligence.
5. M4 Historical route/shipper risk modeling.
6. M6 Cash bundle detection.
7. M7 Luxury item detection.
8. M8 News trend risk signal.

## Communication Rules
1. Keep recommendations concise and execution-first.
2. Provide tradeoffs with one recommended path.
3. If data is missing, ask only for the minimum required dataset details to proceed.
