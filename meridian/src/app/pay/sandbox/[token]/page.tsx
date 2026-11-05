export default async function SandboxPayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <>
      <a className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:px-3 focus:py-2" href="#pay-main">
        Skip to payment notice
      </a>
      <main id="pay-main" className="mx-auto max-w-lg px-6 py-16">
        <p className="text-sm">Draft for counsel review. Not legal advice.</p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sandbox payment handoff</p>
        <h1 className="mt-2 text-2xl font-semibold">Secure payment page</h1>
        <p className="mt-4 text-sm leading-6">
          This page stands in for a PCI-hosted processor. It does not ask for or store a card number, bank account, or Social Security number, and it does not take a payment.
          Reference {token.slice(0, 12)}.
        </p>
        <p className="mt-4 text-sm leading-6">
          This is an attempt to collect a debt and any information obtained will be used for that purpose. This communication is from a debt collector.
          This sentence is a draft of the federal mini-Miranda. Counsel must approve it before it is used outside sandbox. 15 U.S.C. § 1692e(11); 12 CFR § 1006.18.
        </p>
        <p className="mt-4 text-sm leading-6" lang="es">
          Este es un intento de cobrar una deuda y cualquier información obtenida se utilizará con ese fin. Esta comunicación proviene de un cobrador de deudas.
          Borrador para revisión de un abogado. No es el formulario modelo en español de la CFPB.
        </p>
      </main>
    </>
  );
}
