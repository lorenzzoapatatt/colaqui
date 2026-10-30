import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { requireRequestOwner } from "@/modules/auth/presentation/require-request-owner";
import { listProductPhotos } from "@/modules/media/application/list-product-photos";
import { uploadProductPhoto } from "@/modules/media/application/upload-product-photo";
import {
  productErrorResponse,
  productEtag,
} from "@/modules/products/presentation/http";

export const runtime = "nodejs";

interface PhotoRouteContext {
  params: Promise<{ productId: string }>;
}

async function productId(context: PhotoRouteContext): Promise<string> {
  return z.uuid().parse((await context.params).productId);
}

export async function GET(
  request: Request,
  context: PhotoRouteContext,
): Promise<NextResponse> {
  try {
    await requireRequestOwner(request);
    return NextResponse.json(await listProductPhotos(await productId(context)));
  } catch (error) {
    return productErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: PhotoRouteContext,
): Promise<NextResponse> {
  try {
    await requireRequestOwner(request);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ZodError([]);
    const expectedVersion = z.coerce
      .number()
      .int()
      .positive()
      .parse(form.get("expectedVersion"));
    const photo = await uploadProductPhoto({
      productId: await productId(context),
      expectedVersion,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    return NextResponse.json(photo, {
      status: 201,
      headers: { ETag: productEtag(expectedVersion + 1) },
    });
  } catch (error) {
    return productErrorResponse(error);
  }
}
