export interface ProductMediaState {
  version: number;
  activePhotoCount: number;
}

export interface ProductPhotoRecord {
  id: string;
  productId: string;
  objectKey: string;
  processedObjectKey: string;
  bucket: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  checksum: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductPhotoView extends ProductPhotoRecord {
  readUrl?: string;
}

export interface AddProductPhotoInput {
  productId: string;
  expectedVersion: number;
  objectKey: string;
  processedObjectKey: string;
  bucket: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  checksum: string;
  sortOrder: number;
}

export interface MediaRepository {
  getProductMediaState(productId: string): Promise<ProductMediaState | null>;
  addPhotoAndIncrementProduct(
    input: AddProductPhotoInput,
  ): Promise<ProductPhotoRecord | null>;
  listActivePhotos(productId: string): Promise<ProductPhotoRecord[]>;
  reorderPhotosAndIncrementProduct(input: {
    productId: string;
    expectedVersion: number;
    photoIds: string[];
  }): Promise<ProductPhotoRecord[] | null>;
  removePhotoAndIncrementProduct(input: {
    productId: string;
    photoId: string;
    expectedVersion: number;
  }): Promise<boolean | null>;
}
