'use strict';

import { load } from 'cheerio';
import fetch from 'node-fetch';

import { basename } from 'path';

import { getAgent } from '../utils/urlUtil';

import { RunePlugin } from '../types/runePlugin';
import { Gamemode } from '../types/gamemode';
import { Champion } from '../types/champion';
import { PerkData } from '../types/perks';

import { CacheService } from '../services/cache';
import { MenuService } from '../services/menu';

export class OPGG implements RunePlugin {
    public readonly pluginId: string = 'opgg';
    private readonly WEBSITE: string = 'https://www.op.gg';

    public cache: CacheService;

    public constructor() {
        this.cache = new CacheService(this.pluginId);
    }

    public async getRunes(gamemode: Gamemode, champion: Champion): Promise<PerkData> {
        // Check cache first
        const cachedPerks = await this.cache.readCache(gamemode, champion);
        if (cachedPerks) {
            MenuService.log(`[GG.op] Using cached data: ${gamemode} - ${champion}`);
            return cachedPerks.perks;
        }
        // ---

        const runes: PerkData = {
            selectedPerkIds: [],
        };

        const fixedGamemode = this.mapGamemode(gamemode);
        const fixedChampion = this.mapChampion(champion);

        let website = `${this.WEBSITE}`;
        if (fixedGamemode === 'classic') website += `/champions/${fixedChampion}`;
        else website += `/modes/${fixedGamemode}/${fixedChampion}`;

        return fetch(`${website}?region=global&tier=platinum_plus`, {
            method: 'GET',
            redirect: 'follow',
            follow: 10,
            headers: {
                'User-Agent': getAgent(),
                'Content-Type': 'application/text',
            },
        })
            .then((resp) => {
                if (!resp.ok) throw new Error(`[GG.op] Invalid response : ${resp.status}`);
                return resp.text();
            })
            .then((data) => {
                return load(data);
            })
            .then(($) => {
                if ($ == null) return Promise.reject('[GG.op] Failed to get champion data');

                const idSearch =
                    fixedGamemode === 'classic'
                        ? 'main > div:first-of-type > div > div > div:first-of-type img'
                        : 'tr:first-of-type td:first-of-type img';

                const runeImgs = $(idSearch);
                if (!runeImgs) throw new Error(`[GG.op] Failed to get runes`);

                runeImgs.each((i, r) => {
                    const runeId = $(r).attr('src');
                    if (!runeId) throw new Error(`[GG.op] Failed to fetch rune index {${i}}`);
                    if (runeId.indexOf('e_grayscale') !== -1) return; // Ignore grayed out pics

                    const isSpecial = runeId.indexOf('perkStyle') !== -1;
                    const picId = basename(runeId).split('?')[0].replace('.png', '');
                    if (!picId) return;

                    console.warn(picId);

                    const id = parseInt(picId);
                    if (isSpecial) {
                        if (runes.primaryStyleId) runes.subStyleId = id;
                        else runes.primaryStyleId = id;

                        return;
                    }

                    runes.selectedPerkIds.push(id);
                });

                return runes;
            })
            .then((runes) => {
                if (!runes.primaryStyleId || !runes.subStyleId || runes.selectedPerkIds.length <= 0)
                    throw new Error(`[GG.op] No runes found for {${champion.originalName}}`);
                return runes;
            })
            .then(() => {
                this.cache.writeCache(gamemode, champion, runes);
                return runes;
            });
    }

    public mapChampion(champion: Champion): string {
        let name: string = champion.name;
        if (name.indexOf('Nunu &') !== -1) name = 'nunu';

        return name;
    }

    public mapGamemode(gamemode: Gamemode): string {
        if (gamemode === 'practicetool') return 'classic';
        return gamemode;
    }
}
