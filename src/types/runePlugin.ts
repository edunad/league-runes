import { Champion } from './champion';
import { Gamemode } from './gamemode';
import { PerkData } from './perks';
import { Build } from './build';
import { ItemBlock } from './itemSet';
import { Role } from './role';

export interface RunePlugin {
    readonly pluginId: string;

    getBuild(gamemode: Gamemode, champion: Champion, role: Role | null): Promise<Build>;

    getRunes($: any): Promise<PerkData>;
    getItems($: any): Promise<ItemBlock[]>;

    mapRole(role: Role): string;
    mapChampion(champion: Champion): string;
    mapGamemode(gamemode: Gamemode): string;
}
