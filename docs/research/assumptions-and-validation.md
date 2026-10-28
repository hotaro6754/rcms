# Assumptions and validation

Each assumption the product currently relies on, how it would be tested, and what would change.

| # | Assumption | Risk if wrong | Validation method | Signal to look for |
|---|---|---|---|---|
| A1 | Practising decisions on synthetic cases transfers to real work | Core value fails | Pilot with one team: case scores vs QA error rates on live work over 8 weeks | Lower first-pass error rate for case-trained staff |
| A2 | Managers want competency evidence more than completion | Manager view unused | 5 manager interviews; usage of `/team` competency matrix | Weekly use; requests for more competencies |
| A3 | Keyword-checked notes are good enough with instructor review | Unfair scores | Compare automated documentation scores with two instructors on 30 attempts | Agreement ≥ 80% within 25 points |
| A4 | Learners use the assistant before raising a ticket | Support load unchanged | Ratio of assistant conversations ending without a ticket; feedback ratings | ≥ 60% helpful, falling ticket volume per learner |
| A5 | Three denial patterns are a meaningful start | Content too thin | Team-lead ranking of denial types (P3) | Top-5 types covered within two releases |
| A6 | Learners in India serving US payers are the first market | Wrong pricing and channels | Signup source and country data once live; interviews | Majority of paid signups from the target segment |
| A7 | Rubric weights and pass marks are sensible | Pass/fail feels arbitrary | Item analysis after 100 attempts per case | No criterion that everyone passes or fails |

Nothing here has been validated yet. Interviews were not possible from this build environment.
