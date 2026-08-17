import { notFound } from "next/navigation";
import { getStorefrontProductBySlug } from "@/lib/storefront-api";
import { ProductDetailClient } from "./product-detail";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getStorefrontProductBySlug(slug);
    const title = product.metaTitle || product.name;
    const description = product.metaDescription || (product.description ? product.description.substring(0, 160) : "");
    return {
      title: `${title} | MyPetMart`,
      description,
    };
  } catch {
    return {
      title: "Product Not Found | MyPetMart",
    };
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  let product;
  try {
    product = await getStorefrontProductBySlug(slug);
  } catch (error) {
    const err = error as Error;
    if (
      err.message?.includes("404") ||
      err.message?.includes("PRODUCT_NOT_FOUND") ||
      err.message?.includes("not found")
    ) {
      notFound();
    }
    throw error;
  }

  return (
    <main className="flex-1 bg-[#FFF5E9]">
      <ProductDetailClient product={product} />
    </main>
  );
}
