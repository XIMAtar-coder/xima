/**
 * Normalize XIMAtar image URL from database format to public path
 * Database stores: "public/ximatars/lion.png" or "/ximatars/lion.png"
 * We need: "/ximatars/lion.png"
 */
export const normalizeXimatarImageUrl = (imageUrl: string | null | undefined, fallback = '/ximatars/fox.png'): string => {
  if (!imageUrl) return fallback;
  
  // Remove 'public/' prefix if present
  const normalized = imageUrl.replace(/^public\//, '/');
  
  // Ensure it starts with '/'
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
};
