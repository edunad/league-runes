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

import { PerkAPI } from '../api/perk';

import { CacheService } from '../services/cache';
import { MenuService } from '../services/menu';

export class MetaSRC implements RunePlugin {
    public readonly pluginId: string = 'metasrc';
    private readonly WEBSITE: string = 'https://www.metasrc.com';

    public cache: CacheService;

    public constructor() {
        this.cache = new CacheService(this.pluginId);
    }

    public async getBuild(gamemode: Gamemode, champion: Champion): Promise<Build> {
        // Check cache first
        const cachedPerks = await this.cache.readCache(gamemode, champion);
        if (cachedPerks) {
            MenuService.log(`[MetaSRC]`, `Using cached data: ${gamemode} - ${champion.originalName}`);
            return cachedPerks.build;
        }
        // ---

        const build: Build = { perks: null, items: [] };

        return fetch(`${this.WEBSITE}/${this.mapGamemode(gamemode)}/champion/${this.mapChampion(champion)}`, {
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
                this.cache.writeCache(gamemode, champion, build);
                return build;
            });
    }

    public async getRunes($: any): Promise<PerkData> {
        const perkMap = await PerkAPI.getPerks();
        const runes: PerkData = {
            selectedPerkIds: [],
        };

        const runeContainer = $('#perks > div:last-child > .content-selected svg > image');
        if (!runeContainer) throw new Error(`Failed to get runes`);

        runeContainer.each((i, r) => {
            const runeId = $(r).attr('data-xlink-href');
            if (!runeId) throw new Error(`Failed to fetch rune index {${i}}`);

            const picId = basename(runeId).toLocaleLowerCase();
            const isSpecial = runeId.indexOf('metasrc.com') !== -1;

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
        const containers = $('.tooltip-container');
        if (!containers) throw new Error(`Failed to get items`);

        const blocks: ItemBlock[] = [];

        const startingContainer = $(containers[1]).children(`div:first-of-type`);
        if (!startingContainer) throw new Error(`Failed to get items`);

        blocks.push(this.getStartingItems($, startingContainer)); // Add starting items

        const restContainer = $(containers[1]).children(`div:nth-child(2)`);
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

        const normalItems = $(itemContainer).find(`> div:last-of-type > div:first-of-type img`);
        normalItems.each((o, el) => {
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
        const startingItems = $(startingContainer).find(
            `> div:last-of-type > div:last-of-type > div > div:first-of-type > div:last-of-type > div > div`,
        );

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

    public mapChampion(champion: Champion): string {
        let name: string = champion.name;
        if (name.indexOf('Nunu &') !== -1) name = 'nunu';

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
