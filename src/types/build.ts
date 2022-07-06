import { ItemBlock } from './itemSet';
import { PerkData } from './perks';

export interface Build {
    items: ItemBlock[];
    perks: PerkData;
}
