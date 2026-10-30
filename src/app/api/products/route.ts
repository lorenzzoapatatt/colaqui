import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRequestOwner } from "@/modules/auth/presentation/require-request-owner";
import { createProduct } from "@/modules/products/application/create-product";
import { listProducts } from "@/modules/products/application/list-products";
import { PRODUCT_STATUSES } from "@/modules/products/domain/product";
import {
  productErrorResponse,
  productEtag,
} from "@/modules/products/presentation/http";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    await requireRequestOwner(request);
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const page = await listProducts({
      status: status ? z.enum(PRODUCT_STATUSES).parse(status) : undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
      limit: url.searchParams.has("limit")
        ? Number(url.searchParams.get("limit"))
        : undefined,
    });
    return NextResponse.json(page);
  } catch (error) {
    return productErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await requireRequestOwner(request);
    const product = await createProduct(await request.json());
    return NextResponse.json(product, {
      status: 201,
      headers: { ETag: productEtag(product.version) },
    });
  } catch (error) {
    return productErrorResponse(error);
  }
}
