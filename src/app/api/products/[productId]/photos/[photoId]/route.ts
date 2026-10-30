import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRequestOwner } from "@/modules/auth/presentation/require-request-owner";
import { removeProductPhoto } from "@/modules/media/application/remove-product-photo";
import {
  parseExpectedVersion,
  productErrorResponse,
  productEtag,
} from "@/modules/products/presentation/http";

export const runtime = "nodejs";

interface PhotoRouteContext {
  params: Promise<{ productId: string; photoId: string }>;
}

export async function DELETE(
  request: Request,
  context: PhotoRouteContext,
): Promise<NextResponse> {
  try {
    await requireRequestOwner(request);
    const params = await context.params;
    const expectedVersion = parseExpectedVersion(request);
    await removeProductPhoto({
      productId: z.uuid().parse(params.productId),
      photoId: z.uuid().parse(params.photoId),
      expectedVersion,
    });
    return new NextResponse(null, {
      status: 204,
      headers: { ETag: productEtag(expectedVersion + 1) },
    });
  } catch (error) {
    return productErrorResponse(error);
  }
}
