# AI PRD Readiness Scorecard

Use this scorecard to evaluate any AI feature PRD before approving it for engineering kickoff. Score 0 or 1 for each dimension. Total out of 10.

> **How to score:** Read the "passing" description. If your PRD meets it, score 1. If it doesn't — or if you're not sure — score 0 and use the fix tip before re-scoring.

---

## Scorecard

---

### 1. Eval criteria defined and measurable

**Score: __ / 1**

**Passing:** The PRD defines at least one primary eval metric with a specific numeric target (e.g., "faithfulness > 0.85 on 200-sample golden set") and describes how it will be measured — not just what it is.

**Red flag:** The PRD says the feature "should perform well" or lists success criteria like "users find it helpful" or "model returns correct answers" with no measurement method attached.

**Fix in 30 min:** Pick the single most important output quality dimension (relevance, accuracy, tone, etc.), write it as a measurable metric with a target number, and name the measurement method. You can add secondary metrics later — ship one first.

---

### 2. Golden dataset exists or has a clear owner + due date

**Score: __ / 1**

**Passing:** Either a labeled golden dataset exists and its composition is documented, or the PRD names the person responsible for creating it, specifies the required size and coverage, and includes a due date that is before engineering kickoff.

**Red flag:** The PRD acknowledges that evals are needed but leaves dataset creation as a vague future step. "We'll build it during development" means you'll ship without one.

**Fix in 30 min:** Write one sentence: "Golden dataset owner: [Name]. Target size: [N examples]. Coverage: [topic areas]. Due: [date]." Put it in the eval criteria section. If you don't know who owns it, that is the most important question you have right now.

---

### 3. Confidence thresholds specified for all three action tiers

**Score: __ / 1**

**Passing:** The PRD defines a numeric threshold for high-confidence autonomous action, a range for medium-confidence suggested action, and a floor below which the model abstains or falls back — with a named owner for each threshold.

**Red flag:** The PRD describes the feature behavior without specifying when the model acts vs. defers. "The model will surface suggestions when it's confident" is not a spec.

**Fix in 30 min:** Draw a three-row table: High / Medium / Low. Fill in a number for each boundary (you can revise in testing — the point is to have a starting position). Add one sentence describing what happens at each tier. Put a name next to "who validates these before launch."

---

### 4. Latency SLA defined for each model call in the pipeline

**Score: __ / 1**

**Passing:** The PRD lists every model call in the pipeline separately with p50 and p95 latency targets, plus a total end-to-end budget. It also defines what "degraded mode" looks like when the SLA is breached.

**Red flag:** The PRD lists a single performance requirement like "the feature should be fast" or "responses should appear within a few seconds" without breaking it down by pipeline component or defining degraded behavior.

**Fix in 30 min:** List every model call in your pipeline (even if there's only one). For each, write a p95 number you'd be comfortable defending to engineering. Add one sentence: "If p95 exceeds [X], the feature [does Y]." This is the minimum viable latency spec.

---

### 5. Fallback behavior documented for at least 3 failure types

**Score: __ / 1**

**Passing:** The PRD documents distinct fallback behavior for: (1) model API failure or timeout, (2) model low-confidence output, and (3) model incorrect output detected post-hoc — including what the user sees (or doesn't see) in each case.

**Red flag:** The PRD describes the happy path in detail and mentions error handling in a single generic sentence ("the system will handle errors gracefully") without specifying behavior for any specific failure type.

**Fix in 30 min:** Write three bullet points — one for each failure type above. For each: what triggers it, what the user sees, and who is responsible for the fallback path. This does not need to be a full table yet.

---

### 6. Data readiness go/no-go criteria written and signed off

**Score: __ / 1**

**Passing:** The PRD lists the specific datasets required, their quality bar (completeness, recency, PII handling), and at least three explicit go/no-go criteria that must be true before build starts — with a named data owner for each.

**Red flag:** The PRD lists data sources in a dependency section but does not specify quality requirements or state what would block the project. Data is treated as background context, not a gate.

**Fix in 30 min:** Add a three-item checklist to the data section. Each item should be falsifiable: "X is true" not "we will work toward X." Assign a name to confirm each one. If you're not sure what the quality bar is, that conversation needs to happen before kickoff.

---

### 7. At least one human-in-the-loop checkpoint with override mechanism

**Score: __ / 1**

**Passing:** The PRD identifies at least one decision point where AI output requires or enables human review, and documents the override mechanism — specifically, how a human rejects, modifies, or escalates the AI's output and what gets logged.

**Red flag:** The PRD describes the AI as a helpful assistant without specifying any point where a human can intervene, disagree, or correct the system. "The agent is always in control" is not a checkpoint design.

**Fix in 30 min:** Pick the highest-stakes AI output in your feature. Write one row: Decision | AI role | Human role | How human overrides | What gets logged. That's the minimum. Add rows for other checkpoints in the next draft.

---

### 8. Failure mode pre-mortem completed with mitigations

**Score: __ / 1**

**Passing:** The PRD includes a table of at least five AI-specific failure modes (not generic system failures) with likelihood, impact, a detection signal, and a mitigation strategy for each. At least one failure mode addresses adversarial input or data quality degradation.

**Red flag:** The PRD does not include a pre-mortem, or lists failure modes without detection signals or mitigations — a table of risks with no response plan is a risk register, not a pre-mortem.

**Fix in 30 min:** Run a 20-minute pre-mortem with one engineer and one ops stakeholder. Ask: "It's 90 days post-launch and this feature has caused a significant problem — what happened?" Write down the top five answers as failure modes. Detection and mitigation can be rough at this stage — the point is to name the risks before they find you.

---

### 9. Rollout cost estimate at production scale documented

**Score: __ / 1**

**Passing:** The PRD includes a cost estimate broken down by model call with token counts, expected daily volume, and price per token — calculated at both current scale and projected scale (e.g., 6–12 months out). Budget approval status is noted.

**Red flag:** The PRD does not include a cost estimate, or includes a rough monthly number without showing the calculation. "Costs will be evaluated during development" means finance and engineering will be surprised in production.

**Fix in 30 min:** Estimate tokens per call for each model call (input + output). Multiply by daily call volume. Multiply by the provider's published price per 1M tokens. Do this for current scale and 2× scale. Write it in a table. Flag if it hasn't been approved. This math takes 15 minutes and prevents a very uncomfortable conversation at launch.

---

### 10. Open questions log exists with owners and due dates

**Score: __ / 1**

**Passing:** The PRD includes a log of unresolved questions — technical, legal, operational, or product — where each question has a named owner and a due date. The log is not empty (an empty log in a non-trivial AI feature means questions are not being tracked, not that there are none).

**Red flag:** The PRD presents a complete picture with no open questions, or mentions unknowns in prose without a structured log. Questions without owners are assumptions in disguise.

**Fix in 30 min:** List every "we need to figure out" or "TBD" or "to be confirmed" from your current draft. Put them in a table. Assign each one to the person most likely to know the answer. Set a due date that is before the decision matters. This is the fastest section to write and the one most often skipped.

---

## Total Score

| Your score | Interpretation |
|---|---|
| **9–10** | Ready for engineering kickoff. Run one final review pass, confirm all open questions are in-flight, then proceed. |
| **7–8** | Address the failing dimensions before sprint planning. These are known gaps — close them now while the cost is low. |
| **5–6** | Significant rework needed. Schedule a PRD review with engineering, ops, and at least one cross-functional stakeholder before proceeding. |
| **0–4** | Not ready. Restart with the template. The gaps at this score are not editorial — they are structural, and shipping with them means discovering the answers in production. |

---

## Quick scoring reference

| # | Dimension | Score |
|---|---|---|
| 1 | Eval criteria defined and measurable | __ |
| 2 | Golden dataset has owner + due date | __ |
| 3 | Confidence thresholds for all three tiers | __ |
| 4 | Latency SLA per model call | __ |
| 5 | Fallback behavior for 3+ failure types | __ |
| 6 | Data readiness go/no-go criteria signed off | __ |
| 7 | Human-in-the-loop checkpoint with override | __ |
| 8 | Failure mode pre-mortem with mitigations | __ |
| 9 | Cost estimate at production scale | __ |
| 10 | Open questions log with owners and dates | __ |
| | **Total** | __ / 10 |

---

*Scorecard version: 1.0 — maintained at [https://github.com/amitgambhir/ai-feature-prd-toolkit]*
