'use strict';

/*
 * Copyright © Mythical Rawr 2014-2019
 * Authors: Eduardo de Sousa Fernandes
 * Website: www.failcake.me
 */

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

export class MetaSRC implements RunePlugin {
    public readonly pluginId: string = 'metasrc';
    private readonly WEBSITE: string = 'https://www.metasrc.com';

    public cache: CacheService;

    public constructor() {
        this.cache = new CacheService(this.pluginId);
    }

    public async getBuild(gamemode: Gamemode, champion: Champion, role: Role | null): Promise<Build> {
        // Check cache first
        const cachedPerks = await this.cache.readCache(gamemode, champion, role);
        if (cachedPerks) return cachedPerks.build;
        // ---

        const build: Build = { perks: null, items: [] };
        const url: string = `${this.WEBSITE}/${this.mapGamemode(gamemode)}/champion/${this.mapChampion(champion)}/${role ? role : ''}`;

        return fetch(url, {
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
                if ($ == null) return Promise.reject(`Failed to get champion {${champion.originalName}} data`);

                const runes = await this.getRunes($);
                if (!runes.primaryStyleId || !runes.subStyleId || runes.selectedPerkIds.length <= 0)
                    throw new Error(`No runes found for ${champion.originalName}`);

                const items = await this.getItems($);
                if (!items || items.length <= 0) throw new Error(`No items found for ${champion.originalName}`);

                build.perks = runes;
                build.items = items;

                return build;
            })
            .then((build) => {
                this.cache.writeCache(gamemode, champion, role, build);
                return build;
            });
    }

    public async getRunes($: any): Promise<PerkData> {
        const runes: PerkData = {
            selectedPerkIds: [],
        };

        const runeContainer = $('#perks > div:last-child > .content-selected svg');
        if (!runeContainer) throw new Error(`Failed to get runes`);

        runeContainer.each((i, r) => {
            const rawRunePic = $(`> image`, r).attr('data-xlink-href');
            const rawRuneId = $($(r).parent()).attr('data-tooltip');

            if (!rawRuneId || !rawRunePic) throw new Error(`Failed to fetch rune index {${i}}`);

            const picId = parseInt(rawRuneId.replace('perk-', ''));
            const isSpecial = rawRunePic.indexOf('metasrc.com') !== -1;

            if (isSpecial) {
                if (runes.primaryStyleId) runes.subStyleId = picId;
                else runes.primaryStyleId = picId;

                return;
            }

            runes.selectedPerkIds.push(picId);
        });

        return runes;
    }

    public async getItems($: any): Promise<ItemBlock[]> {
        const container = $('#page-content');
        if (!container) throw new Error(`Failed to get items`);

        const blocks: ItemBlock[] = [];

        const startingContainer = $(container).children('div:first-of-type').children('div:last-of-type');
        if (!startingContainer) throw new Error(`Failed to get items`);

        blocks.push(this.getStartingItems($, startingContainer)); // Add starting items

        const restContainer = $(container).children(`div:nth-child(2)`).children('div:last-of-type');
        if (!restContainer) throw new Error(`Failed to get items`);

        blocks.push(...this.getNormalItems($, restContainer)); // Add remaining items

        return blocks;
    }

    private getNormalItems($: any, itemContainer: any): ItemBlock[] {
        const normalBlock: ItemBlock = {
            hideIfSummonerSpell: '',
            items: [],
            showIfSummonerSpell: '',
            type: 'Item Build',
        };

        const extraBlock: ItemBlock = {
            hideIfSummonerSpell: '',
            items: [],
            showIfSummonerSpell: '',
            type: 'Extra',
        };

        const container = itemContainer.children(':first-of-type').find('div > div > div');
        const $clean = load(`<body>${container.html()}</body>`);

        $clean('img').each((o, el) => {
            const elm = $(el);
            if (!elm) return;

            const picId = basename(elm.attr('data-src')).toLocaleLowerCase();
            if (!picId) return;

            const itemId = picId.replace('.png', '');
            if (o < 6) normalBlock.items.push({ id: itemId, count: 1 });
            else extraBlock.items.push({ id: itemId, count: 1 });
        });

        return [normalBlock, extraBlock];
    }

    private getStartingItems($: any, startingContainer: any): ItemBlock {
        const startingItems = startingContainer.find('div:last-of-type > div:last-of-type > div > div:last-of-type > div > div');

        const $clean = load(`<body>${startingItems.html()}</body>`);
        const items = [];
        const itemCount = [];

        const block: ItemBlock = {
            hideIfSummonerSpell: '',
            items: [],
            showIfSummonerSpell: '',
            type: 'Starting Items',
        };

        $clean('img').each((o, el) => {
            const elm = $clean(el);
            if (!elm) return;

            const picId = basename(elm.attr('data-src')).toLocaleLowerCase();
            if (!picId) return;

            items.push(picId.replace('.png', ''));
        });

        $clean('body > div').each((o, el) => {
            const elm = $clean(el);
            const htmlElm = elm.html();

            if (htmlElm.indexOf('><img') !== -1) return;
            const val = elm.text();
            if (!val) {
                itemCount.push(1);
                return;
            }

            itemCount.push(parseInt(val) || 1);
        });

        items.forEach((itmID, indx) => {
            block.items.push({
                id: itmID,
                count: itemCount[indx] || 1,
            });
        });

        return block;
    }

    public mapRole(role: Role): string {
        if (role === 'bottom') return 'adc';
        return role;
    }

    public mapChampion(champion: Champion): string {
        let name: string = champion.name.toLowerCase();
        if (name.indexOf('nunu&') !== -1) name = 'nunu';
        else if (name.indexOf('wukong') !== -1) name = 'monkeyking';

        return name;
    }

    public mapGamemode(gamemode: Gamemode): string {
        switch (gamemode) {
            case 'aram':
                return 'aram';
            case 'classic':
                return '5v5';
            case 'twisted-treeline':
                return '3v3';
            case 'urf':
                return 'arurf';
            default:
                return '5v5';
        }
    }
}
