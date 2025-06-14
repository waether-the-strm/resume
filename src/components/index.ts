export { default as Header } from "./Header.astro"
export { default as Education } from "./Education.astro"
export { default as Experience } from "./Experience.astro"
export { default as TechStack } from "./TechStack.astro"
export { default as Contact } from "./Contact.astro"
export { default as Languages } from "./Languages.astro"
export { default as FeaturedProjects } from "./FeaturedProjects.astro"
export { default as ProjectStatusBadge } from "./ProjectStatusBadge.astro"

import { default as GTM } from "./scripts/GTM.astro"
import { default as GTMns } from "./scripts/GTMns.astro"
import { default as GA } from "./scripts/GA.astro"
import { default as Lenis } from "./scripts/Lenis.astro"
import { default as ScrollAnimations } from "./scripts/ScrollAnimations.astro"

export const Scripts = {
  GTM,
  GTMns,
  GA,
  Lenis,
  ScrollAnimations,
}
