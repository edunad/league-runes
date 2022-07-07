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

import { CacheService } from '../services/cache';
import { MenuService } from '../services/menu';

export class OPGG implements RunePlugin {
    public readonly pluginId: string = 'opgg';
    private readonly WEBSITE: string = 'https://www.op.gg';

    public cache: CacheService;
    private fixedGamemode: string;

    public constructor() {
        this.cache = new CacheService(this.pluginId);
    }

    public async getBuild(gamemode: Gamemode, champion: Champion): Promise<Build> {
        // Check cache first
        const cachedPerks = await this.cache.readCache(gamemode, champion);
        if (cachedPerks) {
            MenuService.log(`[op.GG]`, `Using cached data: ${gamemode} - ${champion.originalName}`);
            return cachedPerks.build;
        }
        // ---

        this.fixedGamemode = this.mapGamemode(gamemode);
        const fixedChampion = this.mapChampion(champion);

        let website = `${this.WEBSITE}`;
        if (this.fixedGamemode === 'classic') website += `/champions/${fixedChampion}`;
        else website += `/modes/${this.fixedGamemode}/${fixedChampion}`;

        const build: Build = { perks: null, items: [] };

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
        const runes: PerkData = {
            selectedPerkIds: [],
        };

        const idSearch =
            this.fixedGamemode === 'classic'
                ? 'main > div:first-of-type > div > div > div:first-of-type img'
                : 'tr:first-of-type td:first-of-type img';

        const runeImgs = $(idSearch);
        if (!runeImgs) throw new Error(`Failed to get runes`);

        runeImgs.each((i, r) => {
            const runeId = $(r).attr('src');
            if (!runeId) throw new Error(`Failed to fetch rune index {${i}}`);
            if (runeId.indexOf('e_grayscale') !== -1) return; // Ignore grayed out pics

            const isSpecial = runeId.indexOf('perkStyle') !== -1;
            const picId = basename(runeId).split('?')[0].replace('.png', '');
            if (!picId) return;

            const id = parseInt(picId);
            if (isSpecial) {
                if (runes.primaryStyleId) runes.subStyleId = id;
                else runes.primaryStyleId = id;

                return;
            }

            runes.selectedPerkIds.push(id);
        });

        return runes;
    }

    public async getItems($: any): Promise<ItemBlock[]> {
        return null;
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
