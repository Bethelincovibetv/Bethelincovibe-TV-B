export interface SavedDesignDimensions {
  width: number;
  height: number;
  label: string;
  aspect: string;
}

export interface SavedDesign {
  id: string;
  userId?: string;
  title: string;
  type: "graphic" | "logo";
  templateKey: string;
  dimensions: SavedDesignDimensions;
  previewDataUrl: string;
  svgMarkup?: string;
  businessId?: string;
  businessName?: string;
  options: Record<string, any>;
  themeStyle?: string;
  paletteId?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY_PREFIX = "bethel_saved_designs_v2";

function getStorageKey(userId?: string): string {
  return userId ? `${STORAGE_KEY_PREFIX}_${userId}` : STORAGE_KEY_PREFIX;
}

/**
 * Loads all saved designs from local storage for the specified user
 */
export function getSavedDesigns(userId?: string): SavedDesign[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Error reading saved designs:", err);
    return [];
  }
}

/**
 * Saves a new design or updates an existing design in local storage
 */
export function saveDesign(
  designData: Omit<SavedDesign, "id" | "createdAt" | "updatedAt"> & { id?: string },
  userId?: string
): SavedDesign {
  const existing = getSavedDesigns(userId);
  const now = new Date().toISOString();

  let targetId = designData.id;
  if (!targetId) {
    targetId = `design_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  const existingIndex = existing.findIndex((d) => d.id === targetId);

  const newRecord: SavedDesign = {
    ...designData,
    id: targetId,
    userId: userId || designData.userId,
    createdAt: existingIndex >= 0 ? existing[existingIndex].createdAt : now,
    updatedAt: now,
  };

  let updatedList: SavedDesign[];
  if (existingIndex >= 0) {
    updatedList = [...existing];
    updatedList[existingIndex] = newRecord;
  } else {
    updatedList = [newRecord, ...existing];
  }

  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(updatedList));
  } catch (err) {
    console.warn("Storage write limit warning on saved designs:", err);
  }

  return newRecord;
}

/**
 * Duplicates an existing design and adds it to the top of the gallery
 */
export function duplicateDesign(id: string, userId?: string): SavedDesign | null {
  const existing = getSavedDesigns(userId);
  const item = existing.find((d) => d.id === id);
  if (!item) return null;

  const duplicated: SavedDesign = {
    ...item,
    id: `design_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: `${item.title} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updatedList = [duplicated, ...existing];
  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(updatedList));
  } catch (err) {
    console.error("Error duplicating design:", err);
  }

  return duplicated;
}

/**
 * Deletes a design from saved designs
 */
export function deleteDesign(id: string, userId?: string): boolean {
  const existing = getSavedDesigns(userId);
  const filtered = existing.filter((d) => d.id !== id);
  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error("Error deleting design:", err);
    return false;
  }
}

/**
 * Updates the title of a saved design
 */
export function updateDesignTitle(id: string, newTitle: string, userId?: string): SavedDesign | null {
  const existing = getSavedDesigns(userId);
  const index = existing.findIndex((d) => d.id === id);
  if (index < 0) return null;

  existing[index].title = newTitle.trim() || existing[index].title;
  existing[index].updatedAt = new Date().toISOString();

  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(existing));
    return existing[index];
  } catch (err) {
    console.error("Error updating design title:", err);
    return null;
  }
}

/**
 * Direct file download trigger for any base64 Data URL or SVG string
 */
export function downloadDesignImage(design: SavedDesign): void {
  const filename = `${design.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${design.type}`;
  if (design.previewDataUrl) {
    const link = document.createElement("a");
    link.href = design.previewDataUrl;
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else if (design.svgMarkup) {
    const blob = new Blob([design.svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
