# QaitaPass Risks and Investment Pitch

**Team 04 | Farkhod | 17 November 2026**

Educational project for Introduction to Finance. Not a real investment offer. No real funds are requested or accepted.

Based on `Team04_FP_Report_Academic.pdf` (main-text pp. 5–6, 9–14), `Team04_FP_Presentation_Revised.pdf` (PDF pp. 15, 17), and the repository financial calculations. All business figures are classroom assumptions. Amounts below are in **KZT million**.

## 1. Five Main Risks

Ratings are qualitative team judgments. Mitigation measures are proposed unless already demonstrated in the prototype.

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Market: weak demand or unwillingness to pay | High | High | Validate demand and pricing through permitted anonymous research; stage spending. |
| Technology/security: false records or stolen identities | Medium | High | Fabric role checks, dispute flags, identity revocation procedures and planned external audit. |
| Operational: partners reject common rules | High | High | Agree governance, onboarding and standard record formats; compare with a signed SQL database. |
| Financial: slow sales or rising costs | High | High | Maintain a cash reserve, monitor cash flow and link hiring to demand. |
| Regulatory/privacy: inappropriate data processing | Medium | High | Minimise data, restrict access and obtain legal review. |

Fabric records submitted claims; it cannot prove that a physical repair actually occurred. Passing tests does not replace an external security audit.

## 2. Legal and Privacy Review

- **Kazakhstan personal-data rules:** use only synthetic data in this course. A real system would require a lawful processing basis, security, retention/deletion procedures and personal-data storage in Kazakhstan. Keep personal documents off-chain; hashes and identity metadata are not automatically anonymous [1].
- **Digital assets and AIFC:** the current service issues no token and provides no crypto trading, custody or payments. Blockchain use alone does not establish an AIFC licence requirement. This is a scope-based assessment; any future token or financial service needs a fresh legal review [2–3].
- **Legal form and IP:** the report proposes a possible future LLP/TOO. No company is registered. Code and brand ownership, contributor agreements and third-party licences would need to be documented.

## 3. Risk Mitigation in the Budget

| Budget item | Year 0 | Year 1 | Year 2 | Year 3 |
|---|---:|---:|---:|---:|
| Independent code/security audit | 3.50 | — | — | — |
| Periodic follow-up audits | — | 1.00 | 2.00 | 2.00 |
| Legal/compliance | 2.50 | 2.00 | 2.50 | 3.00 |
| Market research | 4.00 | — | — | — |
| Hosting | — | 4.00 | 5.00 | 7.00 |

Source: Final Report and team financial calculations. These costs are **already included** in launch or operating costs; do not add them twice. Audits are planned, not completed. Governance and integration work use staff budgets; separate backup costs are not itemised. The **10.00 cash reserve is a buffer, not an expense**.

## 4. Investment Ask and Valuation

The report and presentation agree on **63.70 million KZT for 20% equity**.

| Calculation | Result |
|---|---:|
| Funding: 42.10 launch + 11.60 Year 1 deficit + 10.00 reserve | **63.70** |
| Post-money valuation: 63.70 / 0.20 | **318.50** |
| Pre-money valuation: 318.50 − 63.70 | **254.80** |

These are internally consistent hypothetical terms, not a validated market valuation.

| Scenario | Funding including reserve | Three-year NPV at 25% |
|---|---:|---:|
| Base | 63.70 | −6.30 |
| 30% fewer client-years | 97.79 | −74.21 |
| Fixed operating costs 15% higher | 75.16 | −34.88 |

Source: team financial calculations. Base-case simple payback is **2.52 years**, assuming even Year 3 cash accrual. Neither downside case pays back within three years. Positive simple payback does not mean the 25% return target is met.

A possible exit in Years 5–6 is illustrative. To target 25% annual gross growth over five years, a 20% investor would need a company equity exit value of approximately **972 million KZT**:

`63.70 × 1.25^5 / 0.20 ≈ 972`.

This assumes no dilution, interim distributions, taxes or transaction costs. It is a return hurdle, not a forecast or guarantee.

## 5. Review Findings

The risk ratings, ask and valuation now match the supplied report and presentation. Before submission, the team should update the report's older 12-test simulation description using the repository's reported **12 simulation + 16 Fabric unit tests**, insert the actual GitHub/video links and update dependency claims. These results were not rerun for this review. The README should also list both refurbisher and diagnostics roles for `addDiagnostic`, matching the inspected chaincode and report.

**Conclusion:** the classroom proposal is financially consistent, but negative three-year NPV and unverified demand mean the real investment case remains unvalidated.

## Sources

- Team 04. (2026). *QaitaPass Final Project Report* and *Revised Presentation*. Supplied internal project documents.
- Team 04. (2026). [Financial calculations](https://github.com/namantai/qaitapass-final/blob/d8bfa270732027c607443ee5b2bfbb48c4da082d/docs/financial-calculations.md), [README](https://github.com/namantai/qaitapass-final/blob/d8bfa270732027c607443ee5b2bfbb48c4da082d/README.md), and [Fabric chaincode](https://github.com/namantai/qaitapass-final/blob/d8bfa270732027c607443ee5b2bfbb48c4da082d/chaincode/lib/qaitapass-contract.js).
- [1] Kazakhstan. *On Personal Data and their Protection*, as amended. [Official text](https://old.adilet.zan.kz/rus/docs/Z1300000094).
- [2] Kazakhstan. *On Digital Assets*, as amended. [Official text](https://old.adilet.zan.kz/eng/docs/Z2300000193).
- [3] AIFC. [Rules on Digital Asset Activities](https://aifc.kz/legal-framework/aifc-rules-on-digital-asset-activities/).

Legal sources consulted 17 November 2026. This contribution does not replace the full report bibliography or AI disclosure.
