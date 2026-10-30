import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRequestOwner } from "@/modules/auth/presentation/require-request-owner";
import { listProductPhotos } from "@/modules/media/application/list-product-photos";
import { reorderProductPhotos } from "@/modules/media/application/reorder-product-photos";
import {
  productErrorResponse,
  productEtag,
} from "@/modules/products/presentation/http";

export const runtime = "nodejs";

interface OrderRouteContext {
  params: Promise<{ productId: string }>;
}

const bodySchema = z.object({
  expectedVersion: z.number().int().positive(),
  photoIds: z.array(z.uuid()).max(20),
});

export async function PUT(
  request: Request,
  context: OrderRouteContext,
): Promise<NextResponse> {
  try {
    await requireRequestOwner(request);
    const productId = z.uuid().parse((await context.params).productId);
    const body = bodySchema.parse(await request.json());
    await reorderProductPhotos({ productId, ...body });
    const photos = await listProductPhotos(productId);
    return NextResponse.json(photos, {
      headers: { ETag: productEtag(body.expectedVersion + 1) },
    });
  } catch (error) {
    return productErrorResponse(error);
  }
}
