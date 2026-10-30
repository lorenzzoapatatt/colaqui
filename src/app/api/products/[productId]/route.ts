import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRequestOwner } from "@/modules/auth/presentation/require-request-owner";
import { archiveProduct } from "@/modules/products/application/archive-product";
import { getProduct } from "@/modules/products/application/get-product";
import { updateProduct } from "@/modules/products/application/update-product";
import type { UpdateProductInput } from "@/modules/products/application/update-product";
import {
  parseExpectedVersion,
  productErrorResponse,
  productEtag,
} from "@/modules/products/presentation/http";

export const runtime = "nodejs";

interface ProductRouteContext {
  params: Promise<{ productId: string }>;
}

async function parseProductId(context: ProductRouteContext): Promise<string> {
  return z.uuid().parse((await context.params).productId);
}

export async function GET(
  request: Request,
  context: ProductRouteContext,
): Promise<NextResponse> {
  try {
    await requireRequestOwner(request);
    const product = await getProduct(await parseProductId(context));
    return NextResponse.json(product, {
      headers: { ETag: productEtag(product.version) },
    });
  } catch (error) {
    return productErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: ProductRouteContext,
): Promise<NextResponse> {
  try {
    await requireRequestOwner(request);
    const id = await parseProductId(context);
    const body: unknown = await request.json();
    const update =
      body && typeof body === "object"
        ? (body as Omit<UpdateProductInput, "id">)
        : ({} as Omit<UpdateProductInput, "id">);
    const product = await updateProduct({
      ...update,
      id,
    });
    return NextResponse.json(product, {
      headers: { ETag: productEtag(product.version) },
    });
  } catch (error) {
    return productErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: ProductRouteContext,
): Promise<NextResponse> {
  try {
    await requireRequestOwner(request);
    const product = await archiveProduct({
      id: await parseProductId(context),
      expectedVersion: parseExpectedVersion(request),
    });
    return NextResponse.json(product, {
      headers: { ETag: productEtag(product.version) },
    });
  } catch (error) {
    return productErrorResponse(error);
  }
}
