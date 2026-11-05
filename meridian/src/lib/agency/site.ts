export function agencyName(): string {
  return process.env.MERIDIAN_AGENCY_NAME?.trim() || "{{agency_name}}";
}

export interface AgencyPage {
  slug: string;
  title: string;
  description: string;
  paragraphs: string[];
}

const COUNSEL = "Draft for counsel review. Not legal advice. Replace {{agency_name}} before publication.";

export function agencyPages(name = agencyName()): AgencyPage[] {
  return [
    {
      slug: "about",
      title: "About",
      description: `Who ${name} is and what a debt collector must tell you.`,
      paragraphs: [
        COUNSEL,
        `${name} collects consumer debts placed with it by creditors and debt buyers. This page does not identify a real agency and does not confirm a license or a bond.`,
        "A debt collector must say that it is a debt collector and that information obtained will be used for that purpose. 15 U.S.C. § 1692e(11); 12 CFR § 1006.18.",
      ],
    },
    {
      slug: "pay",
      title: "How to pay",
      description: "How to look up an account and pay without putting personal identifiers in the address bar.",
      paragraphs: [
        COUNSEL,
        "Use the consumer portal. You will need the reference number, the last four digits of the account, and the ZIP code. Do not put a Social Security number in the page address.",
        "The portal link does not include your name, account number, or Social Security number. Test-mode payments do not ask for a card or a bank account number.",
      ],
    },
    {
      slug: "options",
      title: "Payment options",
      description: "One-time and monthly payment options, including a draft preauthorized debit authorization.",
      paragraphs: [
        COUNSEL,
        "You can make a one-time payment or ask about a plan. A plan total cannot exceed the balance.",
        "A preauthorized debit from a bank account needs your authorization. 12 CFR § 1005.10(b) requires that authorization to be in writing, signed or similarly authenticated, and a copy provided to you. The sandbox stores the authorization text and a proof id. It does not store a bank account number.",
        "ACH through Stripe stays off unless MERIDIAN_ACH_PROVIDER=stripe and live delivery are both set.",
      ],
    },
    {
      slug: "faq",
      title: "FAQ",
      description: "Answers about validation, disputes, and phone calls.",
      paragraphs: [
        COUNSEL,
        "You can ask for validation information about the debt. 15 U.S.C. § 1692g; 12 CFR § 1006.34.",
        "You can tell a debt collector to stop communicating with you. 15 U.S.C. § 1692c(c); 12 CFR § 1006.6(c). Some notices the law still allows are described in those sections. Counsel should explain them.",
        "Calls are limited to convenient times, generally 8:00 a.m. to 9:00 p.m. local time. 12 CFR § 1006.6(b).",
      ],
    },
    {
      slug: "dispute",
      title: "Dispute your debt",
      description: "How to dispute a debt and what a collector must do with a timely dispute.",
      paragraphs: [
        COUNSEL,
        "If you dispute the debt in the validation period, collection of the disputed amount stops until verification is mailed. 15 U.S.C. § 1692g(b); 12 CFR § 1006.38. Counsel should confirm how those rules fit together.",
        "You can also ask for the name and address of the original creditor. Use the form on this page. Do not include a Social Security number or a card number.",
      ],
    },
    {
      slug: "privacy",
      title: "Privacy",
      description: "What this public site stores, and what it does not put in the address bar.",
      paragraphs: [
        COUNSEL,
        "This public site does not use analytics and does not put account numbers, names, or Social Security numbers in page addresses.",
        "A message you send from the contact or dispute form is stored as a complaint record with the text you typed. Do not type a Social Security number or a full account number.",
        "Portfolio files, when loaded in the desk, encrypt Social Security numbers, dates of birth, and full account numbers. See the Safeguards draft for the security program.",
      ],
    },
    {
      slug: "rights",
      title: "Consumer rights",
      description: "A short FDCPA and Regulation F summary, plus Texas notices that counsel must confirm.",
      paragraphs: [
        COUNSEL,
        "Federal law restricts harassment, false statements, and unfair practices by debt collectors. 15 U.S.C. §§ 1692d, 1692e, 1692f; 12 CFR §§ 1006.14, 1006.18, 1006.22.",
        "You may request validation information and dispute the debt. 15 U.S.C. § 1692g; 12 CFR § 1006.34. You may request that communication stop. 15 U.S.C. § 1692c(c); 12 CFR § 1006.6(c).",
        "Texas Financial Code § 392.101 requires a third-party debt collector to file a $10,000 surety bond with the Secretary of State. This website does not confirm that a bond is on file. The owner must verify that before any Texas collection.",
        "Texas Financial Code § 392.307 limits a debt buyer from suing or arbitrating on a time-barred debt and says a payment does not revive the claim. Counsel must confirm the notice and whether it applies to a particular account.",
      ],
    },
    {
      slug: "contact",
      title: "Contact",
      description: "Send a message without putting personal identifiers in the address.",
      paragraphs: [
        COUNSEL,
        `Write to ${name} from the form on this page. The form does not ask for a Social Security number.`,
        "Phone and mailing address on a live site must be the real agency's. They are placeholders here.",
      ],
    },
    {
      slug: "accessibility",
      title: "Accessibility",
      description: "Accessibility statement for the public pages and the consumer portal.",
      paragraphs: [
        COUNSEL,
        "These pages use text, labels, and buttons that work with a keyboard. Focus is visible. The consumer portal has a skip link and English and Spanish drafts.",
        "This is not a formal WCAG audit. Report a barrier through the contact form and include the page name, not an account number.",
      ],
    },
  ];
}

export function pageBySlug(slug: string, name = agencyName()): AgencyPage | undefined {
  return agencyPages(name).find((page) => page.slug === slug);
}
