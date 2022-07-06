import { Champion } from './champion';
import { Gamemode } from './gamemode';
import { PerkData } from './perks';
import { Build } from './build';
import { ItemBlock } from './itemSet';

export interface RunePlugin {
    readonly pluginId: string;

    getBuild(gamemode: Gamemode, champion: Champion): Promise<Build>;

    getRunes($: any): Promise<PerkData>;
    getItems($: any): Promise<ItemBlock[]>;

    mapChampion(champion: Champion): string;
    mapGamemode(gamemode: Gamemode): string;
}
