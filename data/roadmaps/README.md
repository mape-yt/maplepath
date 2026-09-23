# Roadmap data: Phase 7.1

The roadmaps use an additive version 2 content structure.
The existing Journey route returns these files directly. No database migration
or API envelope change is needed. The Journey page displays curated content in
an expandable guidance section when a step has it; older roadmaps remain valid.

## Compatibility rules

- Keep `pathway`, `stream`, and `steps` at the top level.
- Preserve existing step `order` and `type`. Review titles and descriptions
  against current official guidance; correct wording when it is inaccurate.
  Historical timeline records may retain the earlier title, while progress and
  averages still link by `profileKey` and `stepOrder`.
- Do not renumber, reorder, remove, or reuse existing step orders. Saved progress
  and timeline analytics reference them. Structural journey changes need a
  separate migration plan.
- Keep profile keys `EE-CEC`, `EE-FSWP`, and `EE-FSTP` stable. The new roadmap
  `profileKey` documents the existing mapping. New PNP keys are
  `PNP-AAIP-AOS`, `PNP-MPNP-SWM`, `PNP-BC-SW-BASE`, `PNP-BC-SW-EEBC`,
  `PNP-OINP-OWP03-BASE`, and `PNP-OINP-OWP03-EE`; keep them stable as well.
- Register every supported pathway/stream in `registry.js` and the options API.
  The registry also supplies the province for PNP streams.
- `schemaVersion: 2` describes the content format, not a new user journey.
- Old files without a version or enrichment fields remain supported. Consumers
  of new fields should use `step.requiredDocuments ?? []` (and equivalent
  fallbacks), `step.description ?? ""`, and `step.governmentTimeline ?? null`.
- `roadmap.schema.json` is an authoring contract, not runtime middleware.
  `$schema` enables compatible editor validation and is ignored by Journey.
  Validate with a JSON Schema Draft 2020-12 validator with format checks enabled.

## New fields

| Field | Shape and meaning |
| --- | --- |
| `requiredDocuments` | Array of `{ id, title, requirement, description?, condition?, officialLinks? }`. Requirement is `required`, `conditional`, or `optional`. Provide a condition for conditional documents. |
| `preparationChecklist` | Array of `{ id, text, condition? }`. Instructions only; never store a user's completion state here. |
| `officialLinks` | Array of `{ label, url, verifiedAt }`. Use verified official government HTTPS URLs; review dates use `YYYY-MM-DD`. |
| `governmentTimeline` | `null`, or `{ description, scope, minimum, maximum, unit, source }`. Source has the official-link shape. Units are `days`, `weeks`, or `months`; bounds can be null when unknown. |
| `commonMistakes` | Array of plain-text strings. |
| `province` | Province that administers a PNP roadmap. |
| `programStatus` | Status observed during the source review: `active`, `limited`, `paused`, or `closed`. It is a dated observation, not a live guarantee. |
| `lastVerifiedAt` | Date the top-level program and route details were checked against official sources. |
| `federalApplicationRoute` | `express-entry`, `non-express-entry`, or `route-dependent`. Use separate roadmap/profile keys when the federal steps diverge. |
| `officialProgramPage` | Primary official government page, using the official-link shape. |

All new fields are optional in the schema to support legacy files. Empty means
**not yet curated**, not that no documents or preparation are needed. The CEC
roadmap now has curated guidance for all stages. FSWP and FSTP still have empty
new fields and their descriptions have not been newly reviewed for legal
accuracy.

The Alberta Opportunity Stream and Skilled Worker in Manitoba roadmaps were
reviewed against Alberta, Manitoba, and IRCC sources again on 2026-09-22. Their
`governmentTimeline` fields remain null: invitation selection and application
processing times are not fixed promises. The roadmaps describe non-Express
Entry federal PR steps after provincial nomination. Other AAIP and MPNP
streams are not yet represented by these two roadmaps.

The BC PNP Skilled Worker and Ontario Workforce Priority TEER 0–3 programs have
separate base and Express Entry variants because their federal steps diverge
after provincial approval. The variants share provincial eligibility and
application rules but use different stable profile keys, saved progress,
timeline records, analytics, nomination acceptance, and federal application
steps. These roadmaps were checked on 2026-09-22 against the current B.C.,
Ontario, and IRCC guidance. Ontario's former eight OINP streams closed in June
2026 and must not be reintroduced as current pathway options.

CEC stage 6 keeps its historic order because saved progress and analytics use
step order. Its corrected title, description, and guidance clarify that
the Express Entry medical exam normally occurs after invitation and before the
PR application, while biometrics follow application submission and IRCC's
instruction letter. A future journey migration could split or reorder these
milestones if the product needs exact event timing.

## Authoring richer content

Use plain text, not HTML, for descriptions and labels. Future UI renderers should
insert text safely and validate link destinations. Verify each official link
and its supporting guidance before adding immigration requirements or estimates;
do not invent content or review dates. Use the relevant federal or provincial
government source and attach supporting links to the step or document.

Document and checklist IDs must be unique within their respective step arrays
and stable across wording edits. Use lowercase hyphenated IDs. These identify
content only and do not replace the existing step order used by MongoDB.

For government timelines, state precisely what interval `scope` covers. A whole
application processing estimate must not be presented as a per-step estimate.
Require minimum <= maximum when both bounds are known. Use null for unknown
bounds, never zero as a placeholder. Keep `governmentTimeline` null until there
is verified source material. Government estimates remain separate from
`TimelineAverage.averageDays` and are not completion promises or application
deadlines. No analytics calculations use this metadata.

The schema checks field shapes. Author review must additionally check unique
step orders and content IDs, unchanged persisted step identities, conditional
document explanations, timeline bound ordering, correct profile-key mapping,
official source ownership, and source relevance. Adding a new pathway JSON does
not register it: routing and pathway selection support are separate work.
