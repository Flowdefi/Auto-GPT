export default async function SandboxPayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sandbox payment handoff</p>
      <h1 className="mt-2 text-2xl font-semibold">Secure payment page</h1>
      <p className="mt-4 text-sm leading-6">
        This page stands in for a PCI-hosted processor. It does not ask for or store a card number, bank account, or Social Security number.
        Reference {token.slice(0, 12)}.
      </p>
      <p className="mt-4 text-sm leading-6">
        This is an attempt to collect a debt and any information obtained will be used for that purpose. This communication is from a debt collector.
      </p>
    </main>
  );
}
