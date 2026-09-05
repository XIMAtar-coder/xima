/**
 * Normalize XIMAtar image URL from database format to public path
 * Database stores: "public/ximatars/lion.webp" or "/ximatars/lion.webp"
 * We need: "/ximatars/lion.webp"
 */
export const normalizeXimatarImageUrl = (imageUrl: string | null | undefined, fallback = '/ximatars/fox.webp'): string => {
  if (!imageUrl) return fallback;
  
  // Remove 'public/' prefix if present
  const normalized = imageUrl.replace(/^public\//, '/');
  
  // Ensure it starts with '/'
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
};
