'use strict';

import { load } from 'cheerio';
import fetch from 'node-fetch';

import { basename } from 'path';

import { getAgent } from '../utils/urlUtil';

import { RunePlugin } from '../types/runePlugin';
import { Gamemode } from '../types/gamemode';
import { Champion } from '../types/champion';
import { PerkData } from '../types/perks';
import { Build } from '../types/build';
import { ItemBlock } from '../types/itemSet';
import { Role } from '../types/role';

import { CacheService } from '../services/cache';
import { MenuService } from '../services/menu';

import { PerkAPI } from '../api/perk';

export class UGG implements RunePlugin {
    public readonly pluginId: string = 'ugg';
    private readonly WEBSITE: string = 'https://www.u.gg';

    public cache: CacheService;

    public constructor() {
        this.cache = new CacheService(this.pluginId);
    }

    public async getBuild(gamemode: Gamemode, champion: Champion, role: Role | null): Promise<Build> {
        // Check cache first
        const cachedPerks = await this.cache.readCache(gamemode, champion);
        if (cachedPerks) {
            MenuService.log(`[U.op] Using cached data: ${gamemode} - ${champion.originalName}`);
            return cachedPerks.build;
        }
        // ---

        const build: Build = { perks: null, items: [] };

        return fetch(
            `${this.WEBSITE}/lol/champions/${this.mapChampion(champion)}${this.mapGamemode(gamemode)}/build${role ? `?role=${role}` : ''}`,
            {
                method: 'GET',
                redirect: 'follow',
                follow: 10,
                headers: {
                    'User-Agent': getAgent(),
                    'Content-Type': 'application/text',
                },
            },
        )
            .then((resp) => {
                if (!resp.ok) throw new Error(`Invalid response : ${resp.status}`);
                return resp.text();
            })
            .then((data) => {
                return load(data);
            })
            .then(async ($) => {
                if ($ == null) return Promise.reject('Failed to get champion');

                const runes = await this.getRunes($);
                if (!runes.primaryStyleId || !runes.subStyleId || runes.selectedPerkIds.length <= 0)
                    throw new Error(`No runes found for ${champion}`);

                const items = await this.getItems($);
                if (!items) throw new Error(`No items found for ${champion}`);

                build.perks = runes;
                build.items = items;

                return build;
            })
            .then((build) => {
                this.cache.writeCache(gamemode, champion, build);
                return build;
            });
    }

    public async getRunes($: any): Promise<PerkData> {
        const perkMap = await PerkAPI.getPerks();
        const runes: PerkData = {
            selectedPerkIds: [],
        };

        const runeImgs = $(`.rune-trees-container-2:first-of-type img`);
        if (!runeImgs) throw new Error(`Failed to get runes`);

        runeImgs.each((i, r) => {
            const parentClass = $(r).parent().attr('class');
            if (parentClass.indexOf('-inactive') !== -1) return;

            const runeId = $(r).attr('src');
            if (!runeId) throw new Error(`Failed to fetch rune index {${i}}`);

            const isSpecial = runeId.indexOf('assets/lol/runes') !== -1;
            const picId = basename(runeId).replace('.webp', '.png').toLocaleLowerCase();

            if (isSpecial) {
                const styleId = parseInt(picId.replace('.png', ''));

                if (runes.primaryStyleId) runes.subStyleId = styleId;
                else runes.primaryStyleId = styleId;

                return;
            }

            if (!perkMap[picId]) throw new Error(`Failed to map rune {${picId}}`);
            runes.selectedPerkIds.push(perkMap[picId]);
        });

        return runes;
    }

    public async getItems($: any): Promise<ItemBlock[]> {
        const containers = $('.recommended-build_items:first-of-type');
        if (!containers) throw new Error(`Failed to get items`);

        const blocks: ItemBlock[] = [];

        return blocks;
    }

    public mapRole(role: Role): string {
        if (role === 'bottom') return 'adc';
        return role;
    }

    public mapChampion(champion: Champion): string {
        let name: string = champion.name;
        if (name.indexOf('Nunu &') !== -1) name = 'nunu';

        return name;
    }

    public mapGamemode(gamemode: Gamemode): string {
        if (gamemode === 'practicetool' || gamemode === 'classic') return '';
        return `-${gamemode}`; // AKA: champion-gamemode
    }
}
