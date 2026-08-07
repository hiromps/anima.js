import type { Metadata } from "next";
import { getEntry, registry } from "@/registry";
import { PlaygroundClient } from "@/components/playground/PlaygroundClient";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return registry.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = getEntry(slug);
  if (!entry) return { title: "anima.js" };
  // The root layout's title template appends " — anima.js".
  return {
    title: entry.name,
    description: entry.description,
    openGraph: { title: entry.name, description: entry.description },
    alternates: { canonical: `/playground/${slug}` },
  };
}

export default async function PlaygroundPage({ params }: { params: Params }) {
  const { slug } = await params;
  return <PlaygroundClient slug={slug} />;
}
