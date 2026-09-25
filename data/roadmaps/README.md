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
  `PNP-OINP-OWP03-BASE`, `PNP-OINP-OWP03-EE`, `PNP-SINP-ISW-EE`,
  `PNP-SINP-ISW-OID`, `PNP-SINP-ISW-EO`, `PNP-NB-SW-EXP`,
  `PNP-NB-SW-GRAD`, `PNP-NB-SW-PRIORITY`, `PNP-NB-EE-EMP`, and
  `PNP-NB-EE-INTEREST`, `PNP-NS-SW`, `PNP-NS-GRAD`, `PNP-NS-ENT`, and
  `PNP-NS-EE`; keep them stable as well.
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

The Saskatchewan International Skilled Worker roadmaps were checked on
2026-09-23. Saskatchewan Express Entry and Occupations In-Demand use separate
Express Entry and non-Express Entry federal routes and therefore separate
profile keys. Both are marked `limited`: Saskatchewan accepts EOI profiles but
reported no scheduled EOI draws on the review date. Employment Offer is marked
`active` and includes the employer-position assessment plus the applicant's
10-day OASIS validation step. Current sector caps and invitation availability
remain time-sensitive and must be checked on the official Saskatchewan pages.

The New Brunswick roadmaps were checked on 2026-09-23 against current GNB and
IRCC guidance. The three Skilled Worker pathways use the non-Express Entry
federal route; the two Express Entry pathways keep separate profile keys and
federal steps. New Brunswick Experience is marked `limited` because new
invitations have been restricted to health care, education and construction
since May 4, 2026. Priority Occupations is also `limited` because it requires a
job offer resulting directly from a Government of New Brunswick-led recruitment
mission in a listed occupation. New Brunswick Interest is `limited` because it
requires a province-issued letter of interest. Current sector exclusions,
occupation exclusions, invitation priorities and allocation remain
time-sensitive and must be rechecked on the official New Brunswick notices.

Nova Scotia consolidated ten former NSNP streams into four current streams on
February 18, 2026. MaplePath represents those four current selections and does
not advertise the retired stream names as separate programs. The Skilled Worker
roadmap includes its general, Construction and Physician sub-criteria; the
Entrepreneur roadmap includes experienced and international-graduate criteria;
and the Express Entry roadmap includes Nova Scotia experience, Physician and
other Letter of Interest criteria. All four are marked `limited` because EOIs
are selected according to current priorities, allocation and program capacity.
These roadmaps were verified on 2026-09-24 and include the 12-month EOI validity
rule plus the provincial fees effective September 1, 2026.

Prince Edward Island is represented by its six current Workforce streams, PEI
Express Entry, and the business Work Permit Stream. The worker roadmaps include
the six-month EOI validity period, the 30-calendar-day application deadline for
invitations issued from November 1, 2025 onward, and the current $300 Workforce
application fee. The Work Permit Stream remains separate because applicants
first seek a supported work permit and must fulfil a Performance Agreement
before nomination. It is marked limited because the published 2026 draws
through September 17 showed no business invitations. PEI's sector and
occupation priorities remain time-sensitive.

Newfoundland and Labrador is represented by Express Entry Skilled Worker,
Skilled Worker, International Graduate, International Entrepreneur, and
International Graduate Entrepreneur. All use the province's EOI-first model.
Selected worker applicants receive 60 days to submit a complete application,
and applicants outside Canada must follow the current employer invite-code
rules. The two entrepreneur EOI systems were open when reviewed and are marked
active; worker selection is marked limited because invitations depend on
provincial priorities and capacity. These PEI and Newfoundland and Labrador
roadmaps were verified against official provincial and IRCC sources on
2026-09-24.

The new stable profile keys are PNP-PEI-SW-IN, PNP-PEI-SW-OUT, PNP-PEI-CW,
PNP-PEI-IG, PNP-PEI-IE, PNP-PEI-OID, PNP-PEI-EE, PNP-PEI-WP,
PNP-NL-EE-SW, PNP-NL-SW, PNP-NL-IG, PNP-NL-ENT, and PNP-NL-IGE.
Do not rename or reuse them because saved progress, timeline records and
community averages use the profile key.

Yukon is represented by Skilled Worker, Critical Impact Worker, Yukon Express
Entry, and the Yukon Business Nominee Program. The three employer-driven
worker routes use the territory's 2026 EOI and invitation process. Both
published 2026 intake periods were closed when reviewed, so those roadmaps are
marked limited. The business route remains separate because candidates enter
a six-month pool, obtain a supported two-year work permit, establish the
business, and meet the territorial conditions before nomination.

The Northwest Territories is represented by the Employer-Driven Skilled
Worker, Entry Level/Semi-Skilled and NWT Express Entry categories, plus the
Francophone and Business streams. The Employer-Driven roadmaps use the 2026
EOI system and are marked limited. The Francophone and Business streams
continue to accept applications separately on a first-come, first-served basis
and are marked active. The current Business Stream page lists minimum equity
investments of $200,000 within Yellowknife or $100,000 outside Yellowknife;
these current figures replace older amounts still visible in a 2023 PDF.

The new stable profile keys are PNP-YT-SW, PNP-YT-CIW, PNP-YT-EE,
PNP-YT-BIZ, PNP-NT-SW, PNP-NT-ELSS, PNP-NT-EE, PNP-NT-FR, and
PNP-NT-BIZ. These Yukon and Northwest Territories roadmaps were reviewed
against official territorial and IRCC sources on 2026-09-24.

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
