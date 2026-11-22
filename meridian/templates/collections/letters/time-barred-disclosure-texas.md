---
id: "LTR-061"
title: "Texas Time-Barred Debt Notice (Tex. Fin. Code 392.307(e))"
channel: "letter_block"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Statutory wording required in the INITIAL written communication when a debt buyer (or a collector for a debt buyer) collects a Texas consumer debt barred under Tex. Civ. Prac. & Rem. Code 16.004 / Bus. & Com. Code 3.118. Wording is verbatim from the statute; only the debt buyer name is merged."
merge_fields: ["debt_buyer_name_caps"]
required_disclosures: ["392.307(e) verbatim notice"]
send_rules: ["Select exactly one variant from FCRA 605 reporting status and furnishing flag", "Minimum 12-point type, boldfaced, capitalized, or underlined or otherwise conspicuous (392.307(f))", "Place on front of validation notice below total amount (1006.34(d)(3)(iv)(B))", "Payment does NOT revive a barred Texas cause of action (392.307(d)); never include a revival warning for Texas", "Debt buyers may not sue or arbitrate once barred (392.307(c))"]
legal_citations: ["Tex. Fin. Code 392.307 (debt buyers; time-barred debt notice, no revival)", "Tex. Civ. Prac. & Rem. Code 16.004 (four-year limitations period for debt)", "12 CFR 1006.26 (time-barred debt; no suits or threats of suit)", "12 CFR 1006.34(d)(3)(iv) (state disclosures on reverse; time-barred disclosures on front)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Texas Time-Barred Debt Notice (Tex. Fin. Code 392.307(e))

**Requires counsel review before use.**

**VARIANT TX-1: reporting period NOT expired AND debt buyer furnishes to a CRA (392.307(e)(1))**
THE LAW LIMITS HOW LONG YOU CAN BE SUED ON A DEBT. BECAUSE OF THE AGE OF YOUR DEBT, WE WILL NOT SUE YOU FOR IT. IF YOU DO NOT PAY THE DEBT, {{debt_buyer_name_caps}} MAY CONTINUE TO REPORT IT TO CREDIT REPORTING AGENCIES AS UNPAID FOR AS LONG AS THE LAW PERMITS THIS REPORTING. THIS NOTICE IS REQUIRED BY LAW.

**VARIANT TX-2: reporting period NOT expired, debt buyer does NOT furnish (392.307(e)(2))**
THE LAW LIMITS HOW LONG YOU CAN BE SUED ON A DEBT. BECAUSE OF THE AGE OF YOUR DEBT, WE WILL NOT SUE YOU FOR IT. THIS NOTICE IS REQUIRED BY LAW.

**VARIANT TX-3: reporting period expired (392.307(e)(3))**
THE LAW LIMITS HOW LONG YOU CAN BE SUED ON A DEBT. BECAUSE OF THE AGE OF YOUR DEBT, WE WILL NOT SUE YOU FOR IT, AND WE WILL NOT REPORT IT TO ANY CREDIT REPORTING AGENCY. THIS NOTICE IS REQUIRED BY LAW.
