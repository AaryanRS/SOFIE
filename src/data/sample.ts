/**
 * sample.ts
 * Realistic but entirely fictional sample text with all 6 PII types.
 */
export const SAMPLE_TEXT = `INTERNAL MEMO — ACME FINTECH LTD (FICTIONAL)
==============================================
This document is for internal testing purposes only.
All data below is entirely fictional.

--- EMPLOYEE RECORDS ---

Employee: Rahul Verma
Email: rahul.verma@acmefintech.in
Alternate: r.verma+work@acmefintech.co.in
Phone: +91 9867452310
Office ext: 09845120034
PAN: BVZPR4521K
Aadhaar: 2374 8821 9043

Employee: Priya Nambiar
Email: priya.nambiar@acmefintech.in
Phone: +91-7756890123
PAN: CPQNS7731M
Aadhaar: 5512-3348-7721

--- SERVER LOG EXCERPT ---

2024-11-01 10:04:22 INFO  Request from 192.168.10.5 → gateway 10.0.0.1
2024-11-01 10:04:23 WARN  Retry from 172.16.0.44 (timeout)
2024-11-01 10:04:30 INFO  Auth: 203.0.113.42 passed
2024-11-01 10:04:31 DEBUG Source IP 198.51.100.7 flagged for review

--- PAYMENT RECORDS ---

Transaction #A1029:
  Card: 4111 1111 1111 1111  (Visa Test)
  Card: 5500-0055-5555-5559  (MC Test)
  Card: 6011111111111117      (Discover Test)
  Auth email: payments@acmefintech.in

--- SUPPORT TICKETS ---

Ticket #SBK-00412
  Customer email: deepak.rao@gmail.com
  Mobile: 8800123456
  Issue: unable to login from IP 8.8.8.8
  PAN provided: DRSPQ9988Z
  Aadhaar on file: 1122 3344 5566

--- END OF DOCUMENT ---
`;
