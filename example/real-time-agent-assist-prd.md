# PRD: Real-Time Agent Assist
### NovaCare Contact Center AI Platform

**Feature name:** Real-Time Agent Assist (RTAA)
**Author:** Senior PM, Contact Center Technology
**Last updated:** 2026-03-18
**Status:** `[x] In Review`

---

## 1. Feature Brief

**Problem statement**
NovaCare contact center agents handle an average of 45 calls per day across claims, benefits, and prior authorization topics. Average handle time (AHT) is 8.4 minutes — 2.1 minutes above industry benchmark — primarily because agents spend time manually searching the knowledge base mid-call while the customer waits. Simultaneously, supervisor escalation rates for high-frustration calls are 18%, but post-call QA reviews show that roughly 40% of those escalations could have been avoided if the agent had recognized the frustration signal 60–90 seconds earlier.

**AI hypothesis**
We believe that if the model surfaces relevant KB articles within 1.5 seconds of a customer utterance, generates a sentiment alert when frustration tone is detected above threshold, and offers a contextually grounded response suggestion — all inside the agent's existing workspace — agents will reduce KB search time by > 50%, improve first-call resolution on common claim types, and catch escalation-bound calls earlier. This belief is grounded in a pilot study conducted with 12 agents on our Medicare Advantage line in Q4 2025, where agents using static KB shortcuts reduced AHT by 1.4 minutes on average. RTAA replaces the manual part of that workflow with a live, ranked, context-aware surface.

**Definition of done — AI component only**
The AI component is complete when: (1) KB article relevance score exceeds 0.80 on the golden eval dataset across all four call topic categories (claims, benefits, prior auth, billing); (2) sentiment alert precision is ≥ 0.75 with recall ≥ 0.65 on the labeled validation set; and (3) the end-to-end pipeline meets latency SLA at p95 under simulated peak load (600 concurrent calls). Feature UI, agent training, and change management are out of scope for this definition.

---

## 2. Eval Criteria

**What does a good output look like? (plain language)**
A good KB suggestion surfaces the single most relevant article for the customer's current topic within the first sentence or two of that topic being raised — before the agent would otherwise need to search. It does not surface articles from adjacent but wrong categories (e.g., a dental benefits article during a pharmacy claim call). A good sentiment alert fires when a customer's language or tone has measurably shifted toward frustration — not because they said a negative word once, but because the pattern is sustained. A good response suggestion gives the agent a factually grounded, appropriately toned sentence or two they could adapt and use — it does not hallucinate policy details or suggest actions the agent cannot actually take.

**What does a bad output look like? (plain language)**
A bad KB result is an article from the wrong product line, a document that was accurate six months ago but has been superseded, or three equally ranked results with no meaningful differentiation. A bad sentiment alert fires because the customer said "this is terrible weather we're having" — a false positive that trains agents to ignore the panel. A bad response suggestion includes a benefit amount that has changed since the KB was last updated, or recommends a process step that requires a supervisor that isn't available.

**Primary eval metric and target**

| Metric | Target | Measurement method |
|---|---|---|
| KB article relevance score | > 0.80 | Cosine similarity against QA-labeled ground truth articles; validated by human reviewers on 10% sample |
| Sentiment alert precision | > 0.75 | Human evaluation against labeled validation set of 400 clips; false positive rate must be < 25% |
| Sentiment alert recall | > 0.65 | Same labeled set — we accept missing some signals to protect precision |
| Response suggestion acceptance rate | > 30% within 60 days of launch | Agent interaction logs: suggestion shown → agent used/adapted (not verbatim copy) |
| KB suggestion click-through rate | > 40% | Agent interaction logs: article surfaced → agent opened it |
| End-to-end pipeline p95 latency | < 3.0s | Synthetic load test + production percentile monitoring |

**Eval ownership**

- Eval owner: ML Engineering Lead (owns tooling and cadence); PM owns interpretation and go/no-go decisions
- Eval cadence: Weekly during the first 90 days post-launch; monthly thereafter
- Triggers for re-eval: Any prompt change, model version update, KB corpus refresh > 500 articles, CSAT drops > 2 points week-over-week, or acceptance rate drops > 5 points over a two-week window

**Golden dataset**

- Does one exist? `[x] Partial` — QA team has 180 labeled call segments; we need 500 for launch
- Who creates the remainder: QA team lead and two senior QA analysts
- Due date: 4 weeks before engineering kickoff
- Size and composition: 500 examples covering all four call topic categories; 100 examples per sentiment tier (neutral, mild frustration, high frustration, escalation); representative of Medicare Advantage, Medicaid, and ACA product lines
- Refresh cadence: Quarterly; or immediately following any KB content restructure

---

## 3. Confidence & Threshold Spec

**High confidence — model acts autonomously**

- Threshold: Relevance score ≥ 0.85 (KB); sentiment score ≥ 0.80 (frustration)
- Action taken: KB article is surfaced immediately in the top position of the sidebar without agent action; sentiment alert banner activates with recommended next step
- Risk if wrong: Agent receives incorrect KB article and may reference wrong policy to customer; sentiment alert fires unnecessarily, creating noise and eroding agent trust in the panel

**Medium confidence — model suggests, human confirms**

- Threshold: Relevance score 0.65–0.84 (KB); sentiment score 0.60–0.79
- Action taken: KB article is surfaced in the sidebar ranked below a higher-confidence result, or alone with a visual indicator that this is a suggested match; sentiment banner displays in "heads up" state (not alert red) with soft language
- Confirmation mechanism: Agent opens the article (passive confirmation) or dismisses it; no explicit click required for KB suggestions in this tier — agent chooses by engaging or ignoring

**Low confidence / abstain — fallback triggered**

- Threshold: Relevance score < 0.65 (KB); sentiment score < 0.60
- Action taken: Sidebar shows last-used category shortcut links (static fallback); no sentiment banner displayed
- User-facing behavior: Agent sees the standard sidebar state — no indication that a suggestion was attempted and failed. We do not want agents to see a "no results" message mid-call.

**Threshold governance**

- Who sets the initial thresholds: ML Engineering Lead, validated with ops team against golden dataset
- Validation before launch: Thresholds tested against all 500 golden examples; false positive rate for sentiment reviewed with supervisor team before approval
- Who can change in production: ML Engineering Lead can adjust within ±5 points without PM approval; changes beyond that range require PM + ops sign-off
- Change process: All threshold changes logged in the model config changelog; eval re-run required before change is promoted to production

---

## 4. Latency SLA

**Per-call latency budget**

| Model call | p50 target | p95 target | Notes |
|---|---|---|---|
| Transcript ingestion + chunking | 50ms | 120ms | Handled by streaming transcript service; not a model call |
| KB embedding + retrieval (ANN search) | 200ms | 400ms | Embeddings pre-computed nightly for full KB corpus; only query embedding is real-time |
| KB reranking (cross-encoder) | 150ms | 350ms | Cross-encoder runs on top-10 candidates from ANN; GPU-backed inference |
| Sentiment classification | 80ms | 200ms | Smaller, fine-tuned model; must meet 800ms end-to-end for alert |
| Response suggestion generation | 600ms | 1,500ms | Streamed to UI; first token must appear within 400ms |

**Total pipeline latency budget**

- KB surface p50: < 800ms from utterance end to article visible in sidebar
- KB surface p95: < 1,500ms
- Sentiment alert p50: < 400ms from utterance end
- Sentiment alert p95: < 800ms
- Response suggestion p50: < 1,500ms from utterance end
- Response suggestion p95: < 2,500ms
- Includes: transcript ingestion, embedding, retrieval, reranking, generation, API overhead, and UI render

**Degraded mode**

- KB latency SLA breach trigger: p95 > 1,500ms over a rolling 3-minute window
- Sentiment latency breach trigger: p95 > 1,000ms over a rolling 3-minute window
- What happens: KB suggestions are suppressed; sidebar falls back to static shortcut links with a silent indicator; sentiment alerts are suppressed (do not want agents seeing delayed, stale alerts mid-call)
- Who is alerted: On-call ML engineer via PagerDuty (P2); PM is notified via Slack if degraded mode persists > 10 minutes
- Recovery: Feature auto-restores when p95 returns below threshold for 3 consecutive minutes; agents see no transition message

---

## 5. Fallback Behavior Spec

**Model error (API failure, timeout, malformed response)**

- Detection: HTTP 5xx from inference endpoint, or response body fails schema validation, or request exceeds 3,000ms without a streaming token
- User-facing behavior: Sidebar silently falls back to static shortcut links for the agent's primary call category. No error message shown to agent mid-call. Post-call: agent session flagged as "AI unavailable" in analytics.
- Logging: Error type, timestamp, call session ID, and duration of outage logged to the incident pipeline; error rate > 2% over 5 minutes triggers PagerDuty alert
- Auto-retry: Yes — one retry after 500ms for non-streaming calls; no retry for streaming (would exceed latency budget)

**Model low-confidence (below threshold)**

- Detection: Confidence score < lower threshold in response payload, or no candidates pass the relevance floor
- User-facing behavior: KB sidebar displays static category shortcuts. Sentiment banner not shown. Response suggestion panel remains blank. Agent experiences the "off" state of the feature — no visible signal that confidence was low.
- Logging: Low-confidence event logged with call session ID, input transcript window hash, score returned, and which pipeline component was below threshold. This data feeds weekly eval review.

**Model wrong (detected post-hoc via feedback or eval)**

- Detection: Agent thumbs-down on a KB article or response suggestion; QA reviewer flags output in post-call audit; weekly eval run shows regression on any primary metric
- Response protocol: Flagged outputs are added to the review queue. If > 3% of surfaced KB articles receive thumbs-down in a given week, the threshold is temporarily raised by 5 points and ML Engineering is notified. If eval regression > 10% on any metric, the team is notified and a root cause review is scheduled within 48 hours.
- Customer impact mitigation: The agent is always in control — no wrong AI output reaches the customer directly. Agent feedback triggers a correction loop, not a customer-facing action.

**Fallback path ownership**

- Fallback owner: Contact Center Technology team (ensures static KB shortcuts are maintained and accurate); ML Engineering owns the fallback trigger logic
- Fallback tested as part of launch criteria: `[x] Yes` — load test must include a deliberate model outage scenario; fallback behavior verified by ops team with 5 agents in UAT

---

## 6. Data Readiness Gates

**Data required**

| Dataset | Purpose | Source | Owner |
|---|---|---|---|
| Historical call transcripts (90 days) | Prompt context examples; fine-tuning candidates; golden dataset source | Verint call recording platform → S3 pipeline | Data Engineering |
| KB articles (full corpus, ~4,200 articles) | Retrieval corpus; embedding index | Confluence + SharePoint, nightly export | Knowledge Management team |
| QA-labeled call segments (500 examples) | Golden eval dataset for all three model components | QA team manual review | QA Team Lead |
| Agent feedback logs (from pilot) | Seed data for thumbs-down/thumbs-up signal; acceptance rate baseline | RTAA pilot app logs | ML Engineering |
| Product line metadata (Medicare Advantage, Medicaid, ACA) | Topic classification labels; KB routing filter | Product team → Confluence taxonomy | PM |

**Data quality bar**

- Completeness: > 95% of transcript records must have start/end timestamps, agent ID, and call disposition; KB articles must have last-modified date and owning team populated
- Recency: KB articles used in retrieval corpus must have been reviewed within the past 90 days; articles without a review date are excluded from the corpus until reviewed
- PII handling: All call transcripts processed through NovaCare's Presidio-based redaction pipeline before storage or use; customer names, member IDs, DOBs, and SSNs replaced with typed tokens (e.g., `[MEMBER_ID]`); legal has reviewed and approved this approach as of 2026-01-14
- Known data quality issues: Approximately 12% of KB articles have not been reviewed in > 180 days — Knowledge Management team has a cleanup sprint scheduled for the 6 weeks prior to build start. If this is not complete, those articles are excluded from the corpus at launch.

**Go/no-go criteria**

- [ ] 90 days of PII-redacted call transcripts available in the designated S3 bucket, confirmed by Data Engineering
- [ ] Full KB corpus exported and embeddings pre-computed, with last-modified metadata present on > 98% of articles
- [ ] 500-example golden dataset reviewed, labeled, and approved by QA Team Lead
- [ ] Legal has confirmed data residency: all model inference and data storage must remain in AWS us-east-1; vendor confirmation in writing
- [ ] KB article freshness cleanup sprint complete, or exclusion list for stale articles finalized and agreed with Knowledge Management

---

## 7. Human-in-the-Loop Checkpoints

| Decision | AI role | Human role | Override mechanism | Logging requirement |
|---|---|---|---|---|
| Surface KB article to agent | Retrieve and rank top 3 relevant articles based on live transcript context | Agent selects which article, if any, to reference; AI never pushes content to customer | Agent dismisses suggestion by clicking X or ignoring; no action required to decline | Article ID, rank position, relevance score, agent action (opened / dismissed / no interaction), timestamp |
| Sentiment alert — heads-up state | Classify customer tone as mild frustration (medium confidence tier) | Agent decides whether to adjust tone or approach; no supervisor notification at this tier | Agent closes the alert banner; logged as "acknowledged — no action" | Alert ID, sentiment score, confidence tier, agent action (acknowledged / dismissed / escalated), call timestamp |
| Sentiment alert — high-risk state | Classify customer tone as escalation-risk (high confidence tier) | Agent decides to escalate to supervisor or de-escalate directly; supervisor notified but not required to intervene | Supervisor can dismiss the notification and mark as "agent handling"; agent can continue without escalation | Alert ID, sentiment score, supervisor notified (Y/N), supervisor action, agent action, resolution outcome |
| Response suggestion | Generate a suggested response based on KB article and conversation context | Agent reads suggestion and decides whether to adapt, use loosely, or ignore; suggestion is never read verbatim to customer | Agent closes the suggestion panel; any adaptation is agent's own language | Suggestion ID, KB article referenced, agent action (adapted / dismissed / no interaction), time-to-decision |
| Post-call QA review | Flag calls where AI confidence was low or agent feedback was negative | QA reviewer listens to flagged calls and labels AI outputs as correct / incorrect / borderline | QA reviewer can reclassify AI output; reclassification updates the review queue | QA reviewer ID, call session ID, original AI output, reviewer label, notes |

**Escalation path**
If an agent dismisses two consecutive high-confidence sentiment alerts without escalating, the supervisor receives a passive notification at the end of the call for review. This is not a real-time interruption — it informs post-call coaching. Any call where RTAA is in degraded mode for > 5 minutes is flagged for supervisor review in the session log.

---

## 8. Failure Mode Pre-Mortem

| Failure mode | Likelihood | Impact | Detection signal | Mitigation strategy |
|---|---|---|---|---|
| Transcript lag causes KB article to surface after topic has changed | H | M | Agent feedback: "article was for something we already resolved"; QA review of suggestion timing vs. topic transitions | Implement topic-change detection; suppress KB suggestion if topic classifier detects shift within 10s of article surface; add 200ms buffer before surfacing |
| Sentiment model flags neutral frustration language as high-risk | H | M | False positive rate > 25% in weekly eval; agent trust survey shows low confidence in alerts | Precision-first threshold tuning before launch; false positive rate reviewed weekly; if > 30% FP rate over two consecutive weeks, high-risk alert tier is temporarily disabled |
| Agent ignores suggestions — acceptance rate never measured | M | H | Acceptance rate metric shows null or 0% after 2 weeks of production traffic | Instrument agent interaction logging before launch; define "acceptance" as any click or adaptation, not just verbatim use; review with engineering in first sprint |
| KB corpus becomes stale post-launch — retrieval returns outdated articles | H | H | Agent feedback; QA flags outdated policy in suggestions; KB review date > 90 days in retrieval logs | Enforce retrieval filter: articles not reviewed in > 90 days are excluded; Knowledge Management team receives weekly report of articles approaching the exclusion threshold |
| Retrieval returns articles from wrong product line | M | H | Agent feedback; QA audit; relevance score appears high but article is for incorrect product | Add product line as a hard filter at retrieval time using call metadata (agent's queue = product line); test cross-product leakage in golden eval set |
| Hallucinated benefit amount or policy detail in response suggestion | M | H | Agent catches and reports incorrect detail; QA audit; customer complaint post-call | Ground all response suggestions in retrieved KB article content; add factual grounding check (response must cite source article); KB-grounded suggestions preferred over generative completions for policy-sensitive content |
| PII leak — member ID or DOB appears in response suggestion | L | H | Output scanner alert; agent report | PII output scanner runs on all generated text before render; any PII-pattern match suppresses the output and logs a P1 alert; redaction pipeline reviewed in security audit before launch |
| Model vendor outage during peak call hours | M | H | API error rate > 2% over 5 minutes; PagerDuty alert | Degraded mode is fully tested before launch; static KB shortcuts provide a usable fallback; evaluate secondary inference vendor as contingency for Q3 2026 |

---

## 9. Rollout Risk Flags

**Model/vendor dependency risks**

- Model provider: Anthropic Claude Sonnet 4.6 (response generation + reranking); separate fine-tuned sentiment model hosted on NovaCare's AWS infrastructure
- Single-vendor dependency for generation: Yes — no fallback vendor at launch; mitigation is degraded mode (static KB) rather than vendor switching
- API stability: Pinned to claude-sonnet-4-6; Anthropic's stated deprecation policy requires 6 months notice; PM to track model lifecycle quarterly
- Outage impact: Generation and reranking degrade to static KB fallback; sentiment model is self-hosted and not affected by Anthropic outages

**Cost at scale**

| Component | Est. tokens/call | Daily call volume | Price/1M tokens | Daily cost | Monthly cost |
|---|---|---|---|---|---|
| KB retrieval context (query + top-3 chunks) | 2,200 input | 18,000 | $3.00 | $118.80 | $3,564 |
| Response suggestion generation | 1,800 input + 300 output | 18,000 | $15.00 output / $3.00 input | $178.20 | $5,346 |
| Reranking (cross-encoder, self-hosted) | — | 18,000 | GPU compute ~$0.002/call | $36.00 | $1,080 |
| Sentiment model (self-hosted) | — | 18,000 | GPU compute ~$0.001/call | $18.00 | $540 |
| **Total** | | | | **~$351/day** | **~$10,530/month** |

Budget approved: `[ ] No — pending approval from VP Engineering and Finance; presented in Q2 2026 planning`

Cost sensitivity: At 30,000 daily calls (peak projection in 12 months), monthly cost scales to ~$17,500. This remains within the approved AI platform budget envelope per the 2026 roadmap.

**Prompt injection surface area**

Three entry points for untrusted content: (1) live customer utterance → transcript → prompt context; (2) agent workspace notes if included in context window; (3) KB article content if a malicious article were added to the corpus. Mitigations: (1) system prompt instructs model to treat all transcript content as data, never as instructions; (2) agent notes are not included in the prompt at launch; (3) KB article ingestion pipeline includes a content review step before articles enter the retrieval corpus.

**PII / data residency risks**

- Does the prompt contain PII? The transcript is redacted before it enters the prompt pipeline. Redaction tokens (e.g., `[MEMBER_ID]`) are included as structural context but contain no actual PII. This approach has been reviewed by legal.
- Data residency requirement: All model inference, prompt data, and logs must remain in AWS us-east-1. Confirmed with Anthropic enterprise agreement as of 2026-02-01. Self-hosted models already meet this requirement.
- Legal/privacy review completed: `[x] Yes` — completed 2026-02-14; documented in NovaCare legal review tracker, case #LGL-2026-0047

**Rollback plan**

- Can this feature be turned off without a code deploy: Yes — RTAA is behind a LaunchDarkly feature flag with per-agent and per-queue targeting. Full kill switch available to PM and on-call engineer.
- Rollback trigger criteria: Eval regression > 15% on any primary metric; CSAT drops > 5 points in RTAA-enabled queue vs. control; P1 incident involving PII or incorrect policy surfaced to customer; acceptance rate drops below 10% sustained over 5 business days
- Rollback owner: PM (decision authority); ML Engineering (executes flag change)
- Estimated rollback time: < 2 minutes via LaunchDarkly; agents return to standard workspace immediately

---

## 10. Open Questions Log

| Question | Owner | Due date | Status |
|---|---|---|---|
| What is the acceptable false positive rate for high-risk sentiment alerts before ops team loses confidence in the feature? | PM + Ops Director | 2026-04-10 | In progress — ops team reviewing pilot data |
| Has legal confirmed that using call transcripts as prompt context (even redacted) is covered by the existing member consent language in NovaCare's privacy policy? | Legal Counsel | 2026-04-01 | Open |
| Which team owns KB article freshness SLA? Knowledge Management team has not formally accepted the 90-day review requirement. | PM + Knowledge Management Director | 2026-04-15 | Open — meeting scheduled |
| What is the escalation path if a response suggestion contains incorrect policy detail and an agent uses it on a call? Is this a QA matter, a legal matter, or both? | PM + Legal + QA Director | 2026-04-22 | Open |
| Do we need a separate disclosure to agents that AI is assisting their calls? HR and labor relations have not been consulted. | HR + Legal | 2026-05-01 | Open |
| What happens to RTAA logs if a call is involved in a regulatory dispute? Are session logs subject to discovery hold? | Legal Counsel + Data Engineering | 2026-04-15 | Open |
| Is the pilot acceptance rate data (collected with a different UI design) comparable to what we'll measure post-launch? | ML Engineering + PM | 2026-04-08 | In progress |
| Should response suggestions be disabled for calls where the agent is handling a complaint that may become a grievance? | PM + Compliance | 2026-04-30 | Open |

---

*This document reflects requirements as of 2026-03-18. All open questions must be resolved before sprint planning begins.*
