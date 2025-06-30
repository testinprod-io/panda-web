export function supportsImages(features: string[]): boolean {
  if (!features) return false;
  return features.includes("image") || features.includes("images");
}

export function supportsPdf(features: string[]): boolean {
  if (!features) return false;
  return features.includes("pdf");
}

export function supportsSearch(features: string[]): boolean {
  if (!features) return false;
  return features.includes("search");
}