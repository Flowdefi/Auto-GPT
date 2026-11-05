"use client";

import { usePortalCopy } from "@/components/collect/portal-frame";

export default function CollectPrivacyPage() {
  const copy = usePortalCopy();
  const spanish = copy.privacy === "Privacidad";
  return (
    <main className="mx-auto max-w-lg px-6 py-10 text-sm leading-6">
      <h1 className="text-3xl font-semibold">{copy.privacy}</h1>
      {spanish ? (
        <>
          <p className="mt-4">Este portal busca una cuenta con un número de referencia, los últimos cuatro dígitos de la cuenta original y un código postal. No escriba un número de Seguro Social.</p>
          <p className="mt-3">El pago de prueba guarda el monto y un recibo de prueba. No pide un número de tarjeta. Un sitio en vivo debe usar una página de pago alojada por un procesador que cumpla con PCI.</p>
          <p className="mt-3">El texto de una disputa se guarda en la cuenta y detiene el contacto de cobro hasta que se revise. Los números de Seguro Social, las fechas de nacimiento y los números de cuenta completos, si vienen en un archivo, se cifran y no se muestran aquí.</p>
        </>
      ) : (
        <>
          <p className="mt-4">This portal looks up an account with a reference number, the last four digits of the original account, and a ZIP code. Do not type a Social Security number into the page or the address bar.</p>
          <p className="mt-3">Test-mode payment records the amount and a sandbox receipt id. It does not ask for a card number, and no card data is stored on this server. A live deployment must use a hosted payment page from a PCI-compliant processor.</p>
          <p className="mt-3">Dispute text is stored on the account and stops further collection contact until the dispute is reviewed. Full Social Security numbers, dates of birth, and full account numbers, when present on a portfolio file, are encrypted and are not shown on this portal.</p>
        </>
      )}
      <p className="mt-3">{copy.disclosure} {copy.counsel}</p>
      <p className="mt-6">
        <a className="inline-flex min-h-11 items-center underline" href="/collect">{copy.back}</a>
      </p>
    </main>
  );
}
