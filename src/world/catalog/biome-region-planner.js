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

