export interface ProductEntry {
  asin: string;
  label?: string;
  note?: string;
  price?: string;
  referencePrice?: string;
  savings?: string;
  imageUrl?: string;
}

export function findProductEntry(
  entries: ProductEntry[],
  asin?: string,
): ProductEntry | undefined {
  if (asin) {
    return entries.find((e) => e.asin.toUpperCase() === asin.toUpperCase());
  }
  return entries[0];
}
