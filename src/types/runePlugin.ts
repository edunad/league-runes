import { Champion } from './champion';
import { Gamemode } from './gamemode';
import { PerkData } from './perks';

export interface RunePlugin {
    readonly pluginId: string;

    getRunes(gamemode: Gamemode, champion: Champion): Promise<PerkData>;

    mapChampion(champion: Champion): string;
    mapGamemode(gamemode: Gamemode): string;
}
