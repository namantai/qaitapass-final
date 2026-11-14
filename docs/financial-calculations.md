# QaitaPass financial calculations

Recalculation of Team 04’s *Final Project Report* (`Team04_FP_Report_Academic.pdf`, 14 November 2026). Source figures come from Tables 4–9 and Appendices A–B (PDF pp. 10–15 and 21–22). Amounts are in **KZT million** unless a row specifies KZT. Prices, customer volumes and costs are the team’s classroom assumptions. One client-year means one paying firm for a full year, or the equivalent across firms.

## Three-year revenue, operating costs and cash flow

| Revenue input or calculation | Year 1 | Year 2 | Year 3 |
|---|---:|---:|---:|
| Paying client-years | 24 | 45 | 70 |
| New passports (500 per client-year) | 12,000 | 22,500 | 35,000 |
| Subscription revenue (client-years × 12 × KZT 150,000) | 43.20 | 81.00 | 126.00 |
| Passport revenue (passports × KZT 2,000) | 24.00 | 45.00 | 70.00 |
| **Total revenue** | **67.20** | **126.00** | **196.00** |

| Cash operating costs (Appendix A, Table 11) | Year 1 | Year 2 | Year 3 |
|---|---:|---:|---:|
| Staffing | 53.40 | 70.20 | 88.20 |
| Hosting | 4.00 | 5.00 | 7.00 |
| Sales and marketing | 10.00 | 12.00 | 18.00 |
| Compliance and legal | 2.00 | 2.50 | 3.00 |
| Administration | 6.00 | 8.00 | 10.00 |
| Annual audit | 1.00 | 2.00 | 2.00 |
| Fixed operating costs (sum of the six rows above) | 76.40 | 99.70 | 128.20 |
| Variable processing (passports × KZT 200) | 2.40 | 4.50 | 7.00 |
| **Total operating cash costs** | **78.80** | **104.20** | **135.20** |

Year 0 development labour uses 36 person-months. Multiplying each role’s months by its monthly cost gives `9 × 1.00 + 9 × 0.80 + 8 × 0.65 + 6 × 0.70 + 4 × 0.55 = 27.80`. The other launch costs are audit (3.50), infrastructure (1.50), design tools (0.80), legal (2.50), market research (4.00) and administration/contingency (2.00). They add to 14.30, giving **42.10** paid in Year 0 (Table 5).

| Project cash flow before financing | Year 0 | Year 1 | Year 2 | Year 3 |
|---|---:|---:|---:|---:|
| Customer receipts | 0.00 | 67.20 | 126.00 | 196.00 |
| Operating cash payments | 0.00 | −78.80 | −104.20 | −135.20 |
| Build and launch payments | −42.10 | 0.00 | 0.00 | 0.00 |
| **Net cash flow** | **−42.10** | **−11.60** | **21.80** | **60.80** |
| **Cumulative cash flow** | **−42.10** | **−53.70** | **−31.90** | **28.90** |

For example, in Year 2, revenue is `45 × 2.80 = 126.00`, cash operating costs are `99.70 + 22,500 × 200 / 1,000,000 = 104.20`, and operating cash flow is `126.00 − 104.20 = 21.80`. The model assumes same-year collection and omits working capital movements, tax and financing costs. Annual software amortisation of `27.80 / 5 = 5.56` reduces Year 2 accounting profit to 16.24. The original development payment is already in Year 0 cash flow.

## Break-even, NPV, payback and funding

| Measure | Calculation from the report inputs | Result |
|---|---|---|
| Year 2 operating break-even | Revenue per client-year = 1.80 subscription + 1.00 passport fees. Processing costs 0.10 per client-year, leaving 2.70. Divide fixed costs of 99.70 by 2.70 and round 36.93 up to a whole client-year. | **37 client-years** compared with 45 in the Year 2 plan. |
| Three-year project NPV | Discount each year-end project cash flow at 25%, with no terminal value. `−42.10 − 11.60/1.25 + 21.80/1.25² + 60.80/1.25³ = −6.2984`. | **−6.30**. The projected flows fall short of the assumed 25% return. |
| Simple payback | At the end of Year 2, 31.90 of the investment remains unrecovered. With Year 3 cash accruing evenly, `2 + 31.90/60.80 = 2.5247`. | **2.52 years**. Discounted payback is beyond the three-year forecast horizon if it occurs. |
| Funding need | The largest cumulative deficit is 53.70 at the end of Year 1. Add the 10.00 cash reserve. | **63.70**. This leaves 21.60 after launch and 10.00 at the end of Year 1. |

## Two pessimistic scenarios

Both cases retain the 42.10 initial outlay, the 10.00 reserve and the 25% discount rate. For each year, `cash flow = client-years × 2.70 − fixed operating costs`. Funding equals the reserve plus the largest cumulative deficit. NPV uses the same year-end formula as the base case. Calculations use full precision before rounding.

| Case | Year 1 CF | Year 2 CF | Year 3 CF | 3-year NPV | Peak deficit | Funding need | Simple payback |
|---|---:|---:|---:|---:|---|---:|---|
| Base | −11.60 | 21.80 | 60.80 | −6.30 | 53.70 (Y1) | 63.70 | 2.52 years |
| Client-years fall 30% | −31.04 | −14.65 | 4.10 | −74.21 | 87.79 (Y2) | 97.79 | Unrecovered at end of Y3 |
| Fixed operating costs rise 15% | −23.06 | 6.845 | 41.57 | −34.88 | 65.16 (Y1) | 75.16 | Unrecovered at end of Y3 |

With **30% fewer client-years**, multiply each base volume by 0.70 to get 16.8, 31.5 and 49.0. The Year 2 cash flow is `31.5 × 2.70 − 99.70 = −14.65`. The cumulative balance reaches −87.79 that year and ends Year 3 at −83.69. Preserving the reserve requires **34.09** more funding than in the base case.

With **15% higher fixed costs**, multiply each annual fixed subtotal by 1.15 to get 87.86, 114.655 and 147.43. Base client volumes and per-passport processing costs stay the same. In Year 2, `45 × 2.70 − 114.655 = 6.845`. Cumulative cash ends Year 3 at −16.745. Preserving the reserve requires **11.46** more funding than in the base case.

**Clarification for the Final Report (PDF p. 10).** The reported figures for all three scenarios agree with the recalculation. In the separate pricing example after Table 4, specify which tariff falls by 20%. The stated 2.34 contribution and 43-client break-even follow from cutting the **monthly subscription alone** to KZT 120,000 (`1.44 + 1.00 − 0.10 = 2.34`). If both the subscription and passport fee fall by 20%, contribution is `2.80 × 0.80 − 0.10 = 2.14`, and Year 2 break-even rises to **47 client-years**.
