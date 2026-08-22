import { getApiBaseUrl } from "./config";
import type { Category, PaginatedProductList, ProductListQuery, ProductDetail, StoreProfile } from "@/types/storefront";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

async function storefrontFetch<T>(path: string, searchParams?: Record<string, string | number | undefined>): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        url.searchParams.append(key, String(val));
      }
    });
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch from storefront API: ${res.status} ${res.statusText}`);
  }

  const body: ApiResponse<T> = await res.json();
  if (!body.success) {
    throw new Error(body.error?.message || "Storefront API request unsuccessful");
  }

  return body.data;
}

export async function getStorefrontCategories(
  petType?: "dog" | "cat" | "all",
  options?: { showOnHomepage?: boolean },
): Promise<Category[]> {
  const params: Record<string, string | undefined> = {};
  if (petType && petType !== "all") {
    params.petType = petType;
  }
  if (options?.showOnHomepage) {
    params.showOnHomepage = "true";
  }
  return storefrontFetch<Category[]>("/storefront/categories", params);
}

export async function getStorefrontProducts(query: ProductListQuery): Promise<PaginatedProductList> {
  const params: Record<string, string | number | undefined> = {
    page: query.page,
    pageSize: query.pageSize,
    search: query.search,
    category: query.category,
    petType: query.petType === "all" ? undefined : query.petType,
    sort: query.sort,
    featured: query.featured ? "true" : undefined,
  };
  return storefrontFetch<PaginatedProductList>("/storefront/products", params);
}

export async function getStorefrontProductBySlug(slug: string): Promise<ProductDetail> {
  return storefrontFetch<ProductDetail>(`/storefront/products/${slug}`);
}

export async function getStorefrontStoreProfile(): Promise<StoreProfile> {
  return storefrontFetch<StoreProfile>("/storefront/store-profile");
}

