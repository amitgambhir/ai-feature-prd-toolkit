# AI Feature PRD Template

> **How to use this template:** Fill in every section before handing off to engineering. Sections you can't fill in are not "TBD" — they are open risks. Treat each blank as a question that needs an owner and a due date.

---

**Feature name:** `[Feature name]`
**Author:** `[Name, role]`
**Last updated:** `[Date]`
**Status:** `[ ] Draft  [ ] In Review  [ ] Approved  [ ] In Build`

---

## 1. Feature Brief

> *This section defines the problem, the AI-specific hypothesis, and what "done" means for the model component. Keep the problem statement narrow — if it takes more than three sentences, you're describing a roadmap, not a feature.*

**Problem statement**
`[What is the user experiencing today that this feature addresses? Be specific about who, what, and when the problem occurs.]`

**AI hypothesis**
`[What behavior do you expect the model to produce, and why will that behavior solve the stated problem? Format: "We believe that if the model does X in context Y, users will experience Z — because..."]`

**Definition of done — AI component only**
`[Not the feature overall. What must be demonstrably true about the model's behavior before you call the AI component complete? This should be verifiable — not "the model performs well" but "the model achieves X metric on Y dataset."]`

---

## 2. Eval Criteria

> *Acceptance criteria describe what a feature does. Eval criteria describe how well the AI component does it — and define the measurement system you'll use to know. Write the plain-language definition first, then make it measurable. If you can't make it measurable, you don't know what you're building.*

**What does a good output look like? (plain language)**
`[Describe a good model response in a sentence or two. Imagine you're explaining it to a QA evaluator who has never seen the feature. What would make them say "yes, that's right"?]`

**What does a bad output look like? (plain language)**
`[The failure modes that matter most. Be specific — "wrong" is not a failure mode. "Surfaces a KB article from the wrong product line" is.]`

**Primary eval metric and target**

| Metric | Target | Measurement method |
|---|---|---|
| `[e.g. Faithfulness score]` | `[e.g. > 0.85]` | `[e.g. LLM-as-judge on 200-sample golden set]` |
| `[e.g. CSAT delta]` | `[e.g. > +4 points vs. control]` | `[e.g. Post-call survey, A/B split]` |
| `[Add rows as needed]` | | |

**Eval ownership**

- Eval owner: `[Name or role]`
- Eval cadence: `[e.g. Weekly during rollout, monthly in steady state]`
- Triggers for re-eval: `[e.g. Model version update, prompt change, underlying data refresh, CSAT drops > 2 points week-over-week]`

**Golden dataset**

- Does one exist? `[ ] Yes  [ ] No  [ ] Partial`
- If no: Who creates it? `[Name/role]` — By when? `[Date]`
- Size and composition: `[e.g. 500 labeled examples covering X, Y, Z scenarios]`
- Refresh cadence: `[e.g. Quarterly, or after any major KB update]`

---

## 3. Confidence & Threshold Spec

> *AI systems don't return pass/fail — they return a probability or score. This section forces you to decide, in advance, what the system should do at each confidence level. "We'll figure it out in testing" is not a spec.*

**High confidence — model acts autonomously**

- Threshold: `[e.g. Score ≥ 0.85]`
- Action taken: `[What does the system do without human confirmation?]`
- Risk if wrong: `[What's the worst-case outcome if this fires incorrectly?]`

**Medium confidence — model suggests, human confirms**

- Threshold: `[e.g. Score 0.60–0.84]`
- Action taken: `[What is surfaced to the human, and how?]`
- Confirmation mechanism: `[e.g. One-click accept, explicit typing, supervisor approval]`

**Low confidence / abstain — fallback triggered**

- Threshold: `[e.g. Score < 0.60]`
- Action taken: `[What does the system do instead? See Section 5.]`
- User-facing behavior: `[What, if anything, does the user see?]`

**Threshold governance**

- Who sets the initial thresholds? `[Name/role]`
- How are they validated before launch? `[e.g. Tested against golden dataset, reviewed with ops team]`
- Who has authority to change them in production? `[Name/role]`
- Change process: `[e.g. Requires eval re-run + sign-off from X]`

---

## 4. Latency SLA

> *Latency is a product requirement, not an infra detail. Define it here so that engineering knows when to escalate a slow model call — and so you have a clear definition of "degraded" before launch.*

**Per-call latency budget**

| Model call | p50 target | p95 target | Notes |
|---|---|---|---|
| `[e.g. KB retrieval + rerank]` | `[e.g. 400ms]` | `[e.g. 800ms]` | `[e.g. Embeddings pre-computed nightly]` |
| `[e.g. Response generation]` | `[e.g. 900ms]` | `[e.g. 1.8s]` | `[e.g. Streaming enabled]` |
| `[Add rows as needed]` | | | |

**Total pipeline latency budget**

- p50: `[e.g. < 1.5s end-to-end from trigger to UI render]`
- p95: `[e.g. < 3.0s]`
- Includes: `[List all components: model calls, retrieval, post-processing, API overhead]`

**Degraded mode**

- Latency SLA breach trigger: `[e.g. p95 > 3.0s over a 5-minute window]`
- What happens: `[e.g. Feature suppresses suggestions and shows static fallback message]`
- Who is alerted? `[e.g. On-call engineer, PM via PagerDuty]`
- Recovery: `[e.g. Feature auto-restores when p95 returns below threshold for 2 consecutive minutes]`

---

## 5. Fallback Behavior Spec

> *Every AI feature will fail. The question is whether you designed the failure or inherited it. Document the fallback for each failure type before launch. "We'll add error handling later" means you're shipping an untested failure path.*

**Model error (API failure, timeout, malformed response)**

- Detection: `[How does the system know the model call failed?]`
- User-facing behavior: `[Exactly what does the user see or not see?]`
- Logging: `[What is logged, and where?]`
- Auto-retry: `[ ] Yes — after [X]ms, max [N] retries  [ ] No`

**Model low-confidence (below threshold)**

- Detection: `[e.g. Confidence score < threshold in response payload]`
- User-facing behavior: `[e.g. Suggestion is suppressed; generic placeholder shown]`
- Logging: `[e.g. Low-confidence event logged with input hash, score, and timestamp]`

**Model wrong (detected post-hoc via feedback or eval)**

- Detection mechanism: `[e.g. Agent thumbs-down, QA audit, weekly eval run]`
- Response protocol: `[e.g. Flag for review, add to eval dataset, trigger threshold review if rate > X%]`
- Customer impact mitigation: `[e.g. Human follow-up, correction workflow]`

**Fallback path ownership**

- Fallback owner: `[Name/role — who is responsible for fallback path quality, not just uptime?]`
- Fallback tested as part of launch criteria: `[ ] Yes  [ ] No`

---

## 6. Data Readiness Gates

> *Data problems discovered after build start are expensive. This section is a go/no-go gate — not background context. If the data isn't ready, the feature isn't ready.*

**Data required**

| Dataset | Purpose | Source | Owner |
|---|---|---|---|
| `[e.g. Historical call transcripts]` | `[e.g. Prompt context / fine-tuning]` | `[e.g. CRM export]` | `[Name]` |
| `[e.g. KB articles]` | `[e.g. Retrieval corpus]` | `[e.g. Confluence API]` | `[Name]` |
| `[e.g. QA-labeled examples]` | `[e.g. Golden eval dataset]` | `[e.g. QA team]` | `[Name]` |

**Data quality bar**

- Completeness: `[e.g. > 95% of records have required fields populated]`
- Recency: `[e.g. KB articles must have been reviewed within the last 90 days]`
- PII handling: `[e.g. All transcripts redacted via [tool/process] before use; data residency requirement: US-only]`
- Known data quality issues: `[List any known gaps, biases, or staleness problems — don't hide them here]`

**Go/no-go criteria**

> These must be true before build starts. Not "we'll check during QA."

- [ ] `[e.g. 90 days of transcript data available, PII-redacted, confirmed with legal]`
- [ ] `[e.g. KB corpus has > X articles with last-modified date metadata]`
- [ ] `[e.g. Golden dataset of N labeled examples reviewed and approved by [role]]`
- [ ] `[e.g. Data access agreements in place for all external sources]`

---

## 7. Human-in-the-Loop Checkpoints

> *Document every decision point where the AI produces an output that could affect a user. For each one: what role does the AI play, what role does the human play, and what does the override look like? A table with no override mechanism is a table with a gap.*

| Decision | AI role | Human role | Override mechanism | Logging requirement |
|---|---|---|---|---|
| `[e.g. Surface KB article]` | `[e.g. Retrieve and rank candidates]` | `[e.g. Agent selects which, if any, to reference]` | `[e.g. Agent dismisses suggestion; logged as "not used"]` | `[e.g. Article ID, rank position, used/dismissed]` |
| `[e.g. Sentiment alert]` | `[e.g. Classify customer tone as high-risk]` | `[e.g. Supervisor reviews; decides to intervene or not]` | `[e.g. Supervisor dismisses alert; flagged as false positive]` | `[e.g. Alert ID, score, supervisor action, timestamp]` |
| `[e.g. Response suggestion]` | `[e.g. Generate suggested agent reply]` | `[e.g. Agent adapts or ignores; never read verbatim to customer]` | `[e.g. Agent closes suggestion panel; interaction ended]` | `[e.g. Suggestion ID, accepted/modified/dismissed, time-to-decision]` |
| `[Add rows as needed]` | | | | |

**Escalation path**
`[What triggers a human escalation beyond the standard checkpoint? e.g. Two consecutive low-confidence outputs, supervisor flagging an alert as a systematic false positive]`

---

## 8. Failure Mode Pre-Mortem

> *Write this before you build — that's the whole point. For each failure mode, assume it has already happened. What would you have wished you'd built? The mitigations you identify here become requirements, not afterthoughts.*

| Failure mode | Likelihood (H/M/L) | Impact (H/M/L) | Detection signal | Mitigation strategy |
|---|---|---|---|---|
| Context window overflow | `[ ]` | `[ ]` | `[e.g. Model returns truncation error or degrades mid-response]` | `[e.g. Chunk strategy with max token guard; alert if input > 80% of context limit]` |
| Prompt injection via user input | `[ ]` | `[ ]` | `[e.g. Output contains instructions inconsistent with system prompt]` | `[e.g. Input sanitization layer; output classifier for instruction-like content]` |
| Model drift post-deployment | `[ ]` | `[ ]` | `[e.g. Eval regression > X% week-over-week]` | `[e.g. Automated weekly eval run with alerting; pinned model version]` |
| Retrieval returns stale KB article | `[ ]` | `[ ]` | `[e.g. Agent feedback; QA audit flags outdated content]` | `[e.g. Last-modified filter in retrieval; KB refresh SLA enforced]` |
| Hallucinated action recommendation | `[ ]` | `[ ]` | `[e.g. Agent flags suggestion as incorrect; post-call QA review]` | `[e.g. Grounding check against KB; confidence threshold for action suggestions]` |
| PII leak via model output | `[ ]` | `[ ]` | `[e.g. Output scanner detects PII pattern; agent reports]` | `[e.g. PII redaction in prompt pipeline; output scanning before render; audit log]` |

---

## 9. Rollout Risk Flags

> *These are not action items — they are known risks that need a named owner and a mitigation before launch. If a risk has no owner, it is unmitigated.*

**Model/vendor dependency risks**
- Model provider: `[e.g. OpenAI GPT-4o, Anthropic Claude Sonnet]`
- Single-vendor dependency? `[ ] Yes  [ ] No — fallback vendor: [Name]`
- API stability risk: `[e.g. Pinned to model version X; deprecation timeline: Y]`
- Outage impact: `[e.g. Feature degrades to static KB search; users notified via banner]`

**Cost at scale**

| Component | Est. tokens/call | Daily call volume | Price/1M tokens | Daily cost | Monthly cost |
|---|---|---|---|---|---|
| `[e.g. KB retrieval prompt]` | `[e.g. 2,000]` | `[e.g. 10,000]` | `[e.g. $3.00]` | `[Calculated]` | `[Calculated]` |
| `[e.g. Response generation]` | `[e.g. 1,500]` | `[e.g. 10,000]` | `[e.g. $15.00]` | `[Calculated]` | `[Calculated]` |
| **Total** | | | | `[Sum]` | `[Sum]` |

Budget approved: `[ ] Yes  [ ] No — pending approval from: [Name]`

**Prompt injection surface area**
`[Where does untrusted user input enter the prompt? What is the sanitization strategy for each entry point?]`

**PII / data residency risks**
- Does the prompt contain or reference PII? `[ ] Yes  [ ] No`
- Data residency requirement: `[e.g. Data must remain in US-East; confirmed with [vendor] on [date]]`
- Legal/privacy review completed: `[ ] Yes  [ ] No — owner: [Name], due: [Date]`

**Rollback plan**
- Can this feature be turned off without a code deploy? `[ ] Yes — via [feature flag / config]  [ ] No`
- Rollback trigger criteria: `[e.g. Eval regression > 15%, CSAT drop > 5 points, P1 incident]`
- Rollback owner: `[Name/role]`
- Estimated rollback time: `[e.g. < 5 minutes via feature flag]`

---

## 10. Open Questions Log

> *This section is never "done" until launch. Every question without an owner and a due date is a bet you're making silently. Log it here instead.*

| Question | Owner | Due date | Status |
|---|---|---|---|
| `[e.g. What is the acceptable false positive rate for sentiment alerts before ops team escalates?]` | `[Name]` | `[Date]` | `[ ] Open  [ ] In progress  [ ] Resolved` |
| `[e.g. Has legal approved the use of call transcripts for prompt context?]` | `[Name]` | `[Date]` | `[ ] Open  [ ] In progress  [ ] Resolved` |
| `[e.g. Which model version are we pinning to, and what is the vendor's deprecation policy?]` | `[Name]` | `[Date]` | `[ ] Open  [ ] In progress  [ ] Resolved` |
| `[e.g. Who owns KB article freshness — product, ops, or content team?]` | `[Name]` | `[Date]` | `[ ] Open  [ ] In progress  [ ] Resolved` |
| `[Add rows as needed]` | | | |

---

*Template version: 1.0 — maintained at [repo link]*
