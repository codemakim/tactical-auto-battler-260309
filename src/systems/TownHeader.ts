import { getHeroDefinition } from '../data/HeroDefinitions';
import type { HeroType } from '../types';

export function formatTownHeaderHeroInfo(heroType: HeroType): { title: string; subtitle: string } {
  const hero = getHeroDefinition(heroType);
  if (!hero) {
    return {
      title: `Hero: ${heroType}`,
      subtitle: '',
    };
  }

  return {
    title: `Hero: ${hero.name}`,
    subtitle: hero.description,
  };
}
