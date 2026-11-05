export type PortalLang = "en" | "es";

export interface PortalCopy {
  counsel: string;
  skip: string;
  language: string;
  english: string;
  spanish: string;
  lookupEyebrow: string;
  lookupTitle: string;
  lookupBody: string;
  reference: string;
  last4: string;
  zip: string;
  continue: string;
  disclosure: string;
  privacy: string;
  agencySite: string;
  privacyLead: string;
  privacyPayment: string;
  privacyDispute: string;
  bankTitle: string;
  bankBody: string;
  bankConsent: string;
  bankSubmit: string;
  bankProof: string;
  accountTitle: string;
  loading: string;
  back: string;
  balanceLabel: string;
  ending: string;
  itemization: string;
  creditor: string;
  itemDate: string;
  amountThen: string;
  payments: string;
  credits: string;
  fees: string;
  chain: string;
  limitations: string;
  counselShort: string;
  notSupplied: string;
  notCalculated: string;
  download: string;
  periodEnds: string;
  planTitle: string;
  planBody: string;
  currentPlan: string;
  paymentsOf: string;
  months: string;
  eachPayment: string;
  savePlan: string;
  pay: string;
  timeBarredHold: string;
  receipt: string;
  noCard: string;
  dispute: string;
  submitDispute: string;
  status: string;
  error: string;
}

const disclosureEn =
  "This is an attempt to collect a debt and any information obtained will be used for that purpose. This communication is from a debt collector.";
const disclosureEs =
  "Este es un intento de cobrar una deuda y cualquier información obtenida se utilizará con ese fin. Esta comunicación proviene de un cobrador de deudas.";

export const portalCopy: Record<PortalLang, PortalCopy> = {
  en: {
    counsel: "Draft for counsel review. Not a legal notice and not the CFPB Spanish model form.",
    skip: "Skip to account lookup",
    language: "Language",
    english: "English",
    spanish: "Español",
    lookupEyebrow: "Consumer portal",
    lookupTitle: "Look up an account",
    lookupBody: "Use the reference number, the last four of the account, and the ZIP code. Do not put a Social Security number in this page or in the address bar.",
    reference: "Reference number",
    last4: "Last four",
    zip: "ZIP code",
    continue: "Continue",
    disclosure: disclosureEn,
    privacy: "Privacy",
    agencySite: "Agency site",
    privacyLead: "This portal looks up an account with a reference number, the last four digits of the original account, and a ZIP code. Do not type a Social Security number into the page or the address bar.",
    privacyPayment: "Test-mode payment records the amount and a sandbox receipt id. It does not ask for a card number, and no card data is stored on this server. A live deployment must use a hosted payment page from a PCI-compliant processor.",
    privacyDispute: "Dispute text is stored on the account and stops further collection contact until the dispute is reviewed. Full Social Security numbers, dates of birth, and full account numbers, when present on a portfolio file, are encrypted and are not shown on this portal.",
    bankTitle: "Bank debit authorization",
    bankBody: "Draft for counsel review under 12 CFR § 1005.10(b). No bank account number is collected on this page.",
    bankConsent: "I authorize a one-time debit of $25.00 and I have received this copy of the authorization.",
    bankSubmit: "Authorize test debit",
    bankProof: "Authorization proof is stored. The copy is the text above.",
    accountTitle: "Account",
    loading: "Loading…",
    back: "Back to lookup",
    balanceLabel: "Current balance",
    ending: "Account ending",
    itemization: "Itemization",
    creditor: "Original creditor",
    itemDate: "Itemization date",
    amountThen: "Amount then",
    payments: "Payments since",
    credits: "Credits since",
    fees: "Fees since",
    chain: "Chain of title",
    limitations: "Limitations date on file",
    counselShort: "counsel review",
    notSupplied: "not supplied",
    notCalculated: "not calculated",
    download: "Download validation notice (PDF)",
    periodEnds: "Validation period ends",
    planTitle: "Payment plan",
    planBody: "Test mode only. The plan total cannot exceed the balance, and no card is stored.",
    currentPlan: "Current plan",
    paymentsOf: "payments of",
    months: "Months",
    eachPayment: "Each payment in dollars",
    savePlan: "Save test-mode plan",
    pay: "Pay $25.00 in test mode",
    timeBarredHold: "The limitations date on file is in the past. A payment plan and a payment page are not offered here. A collector has to use the counsel-reviewed time-barred notice. This sentence is a draft.",
    receipt: "Test payment",
    noCard: "No card was collected.",
    dispute: "Dispute",
    submitDispute: "Submit dispute",
    status: "Status",
    error: "Error",
  },
  es: {
    counsel: "Borrador para revisión de un abogado. No es un aviso legal y no es el formulario modelo en español de la CFPB.",
    skip: "Saltar a la búsqueda de la cuenta",
    language: "Idioma",
    english: "English",
    spanish: "Español",
    lookupEyebrow: "Portal del consumidor",
    lookupTitle: "Buscar una cuenta",
    lookupBody: "Use el número de referencia, los últimos cuatro de la cuenta y el código postal. No escriba un número de Seguro Social en esta página ni en la barra de direcciones.",
    reference: "Número de referencia",
    last4: "Últimos cuatro",
    zip: "Código postal",
    continue: "Continuar",
    disclosure: disclosureEs,
    privacy: "Privacidad",
    agencySite: "Sitio de la agencia",
    privacyLead: "Este portal busca una cuenta con un número de referencia, los últimos cuatro dígitos de la cuenta original y un código postal. No escriba un número de Seguro Social.",
    privacyPayment: "El pago de prueba guarda el monto y un recibo de prueba. No pide un número de tarjeta. Un sitio en vivo debe usar una página de pago alojada por un procesador que cumpla con PCI.",
    privacyDispute: "El texto de una disputa se guarda en la cuenta y detiene el contacto de cobro hasta que se revise. Los números de Seguro Social, las fechas de nacimiento y los números de cuenta completos, si vienen en un archivo, se cifran y no se muestran aquí.",
    bankTitle: "Autorización de débito bancario",
    bankBody: "Borrador para revisión de un abogado bajo 12 CFR § 1005.10(b). Esta página no pide un número de cuenta bancaria.",
    bankConsent: "Autorizo un débito único de $25.00 y he recibido esta copia de la autorización.",
    bankSubmit: "Autorizar el débito de prueba",
    bankProof: "La prueba de autorización está guardada. La copia es el texto de arriba.",
    accountTitle: "Cuenta",
    loading: "Cargando…",
    back: "Volver a la búsqueda",
    balanceLabel: "Saldo actual",
    ending: "Cuenta terminada en",
    itemization: "Detalle del saldo",
    creditor: "Acreedor original",
    itemDate: "Fecha del detalle",
    amountThen: "Monto en esa fecha",
    payments: "Pagos desde entonces",
    credits: "Créditos desde entonces",
    fees: "Cargos desde entonces",
    chain: "Cadena de título",
    limitations: "Fecha de prescripción en el expediente",
    counselShort: "revisión de un abogado",
    notSupplied: "no proporcionado",
    notCalculated: "no calculada",
    download: "Descargar el aviso de validación (PDF)",
    periodEnds: "El período de validación termina",
    planTitle: "Plan de pago",
    planBody: "Solo modo de prueba. El total del plan no puede superar el saldo y no se guarda ninguna tarjeta.",
    currentPlan: "Plan actual",
    paymentsOf: "pagos de",
    months: "Meses",
    eachPayment: "Cada pago en dólares",
    savePlan: "Guardar el plan de prueba",
    pay: "Pagar $25.00 en modo de prueba",
    timeBarredHold: "La fecha de prescripción en el expediente ya pasó. Aquí no se ofrece un plan de pago ni una página de pago. Un cobrador tiene que usar el aviso revisado por un abogado. Esta frase es un borrador.",
    receipt: "Pago de prueba",
    noCard: "No se recopiló ninguna tarjeta.",
    dispute: "Disputa",
    submitDispute: "Enviar la disputa",
    status: "Estado",
    error: "Error",
  },
};
