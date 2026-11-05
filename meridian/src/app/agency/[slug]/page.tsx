import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AgencyForm } from "@/components/agency/form";
import { agencyPages, pageBySlug } from "@/lib/agency/site";

export function generateStaticParams() {
  return agencyPages().map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = pageBySlug(slug);
  if (!page) return {};
  return { title: page.title, description: page.description, robots: { index: true, follow: true } };
}

export default async function AgencySectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pageBySlug(slug);
  if (!page) notFound();
  return (
    <article>
      <h1 className="text-4xl font-semibold leading-tight">{page.title}</h1>
      {page.paragraphs.map((paragraph) => (
        <p key={paragraph.slice(0, 40)} className="mt-4 leading-7">{paragraph}</p>
      ))}
      {slug === "pay" ? <p className="mt-6"><Link className="underline" href="/collect">Open the consumer portal</Link></p> : null}
      {slug === "dispute" || slug === "contact" ? <AgencyForm kind={slug === "dispute" ? "dispute" : "contact"} /> : null}
    </article>
  );
}
