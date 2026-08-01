import { getEdgeProfile } from "./island-catalog.js";

export function resolveRecipeEdges(template, random) {
  return {
    arrival: resolveEdge(template.edges.arrival, random),
    far: resolveEdge(template.edges.far, random)
  };
}

function resolveEdge(edgeId, random) {
  const profile = getEdgeProfile(edgeId);
  const [min, max] = profile.surface.widthRange;
  return Object.freeze({
    id: profile.id,
    name: profile.name,
    width: random.int(min, max),
    profile
  });
}

