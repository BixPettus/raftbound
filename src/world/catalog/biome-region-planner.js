export function planBiomeRegions({ template, profile, edgeProfiles }) {
  const startX = profile.startX + edgeProfiles.arrival.width;
  const endX = profile.dimensions.width - profile.endMargin - edgeProfiles.far.width;
  const usableWidth = Math.max(1, endX - startX);
  const coverageTotal = template.biomeSlots.reduce((sum, slot) => sum + slot.coverage, 0);
  let cursor = startX;
  return template.biomeSlots.map((slot, index) => {
    const remaining = endX - cursor;
    const width = index === template.biomeSlots.length - 1
      ? remaining
      : Math.max(8, Math.round(usableWidth * (slot.coverage / coverageTotal)));
    const region = {
      biomeId: slot.biomeId,
      role: slot.role,
      coverage: slot.coverage,
      startX: cursor,
      endX: Math.min(endX, cursor + width),
      transitionWidth: template.biomeSlots.length > 1 ? 10 : 0
    };
    cursor = region.endX;
    return region;
  });
}

export function biomeAt(regions, tileX) {
  return regions.find((region) => tileX >= region.startX && tileX < region.endX) ?? regions[regions.length - 1];
}

export function biomeBlendAt(regions, tileX) {
  const primary = biomeAt(regions, tileX);
  if (!primary) return null;
  const index = regions.indexOf(primary);
  const previous = regions[index - 1] ?? null;
  const next = regions[index + 1] ?? null;
  if (previous && primary.transitionWidth > 0 && tileX < primary.startX + primary.transitionWidth) {
    return {
      primaryBiomeId: previous.biomeId,
      secondaryBiomeId: primary.biomeId,
      blend: clamp((tileX - primary.startX) / primary.transitionWidth, 0, 1)
    };
  }
  if (next && primary.transitionWidth > 0 && tileX >= primary.endX - primary.transitionWidth) {
    return {
      primaryBiomeId: primary.biomeId,
      secondaryBiomeId: next.biomeId,
      blend: clamp((tileX - (primary.endX - primary.transitionWidth)) / primary.transitionWidth, 0, 1)
    };
  }
  return { primaryBiomeId: primary.biomeId, secondaryBiomeId: primary.biomeId, blend: 0 };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

