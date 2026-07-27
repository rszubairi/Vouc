import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { api } from "../../../../../../convex/_generated/api";
import { SITE_URL, DEFAULT_OG_IMAGE_URL } from "../../../../lib/site";
import { ShareView } from "./ShareView";

const SHARE_TYPES = ["discussion", "knowledge-hub", "directory"] as const;
type ShareType = (typeof SHARE_TYPES)[number];

function isShareType(value: string): value is ShareType {
  return (SHARE_TYPES as readonly string[]).includes(value);
}

type Params = { type: string; id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { type, id } = await params;
  if (!isShareType(type)) return { title: "Vouch" };

  const item = await fetchQuery(api.public.getSharedItem, { type, id });
  if (!item) return { title: "Vouch" };

  const url = `${SITE_URL}/share/${type}/${id}`;
  const title = item.title || "Vouch";
  const description = item.excerpt || "Shared on Vouch";
  const imageUrl = item.imageUrl ?? DEFAULT_OG_IMAGE_URL;

  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: [{ url: imageUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { type, id } = await params;
  if (!isShareType(type)) notFound();

  const item = await fetchQuery(api.public.getSharedItem, { type, id });
  if (!item) notFound();

  return <ShareView item={item} />;
}
