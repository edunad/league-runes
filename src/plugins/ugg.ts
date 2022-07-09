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
import { Item, ItemBlock } from '../types/itemSet';
import { Role } from '../types/role';

import { CacheService } from '../services/cache';

import { PerkAPI } from '../api/perk';

interface ItemMap {
    [id: string]: number[][];
}

export class UGG implements RunePlugin {
    public readonly pluginId: string = 'ugg';
    private readonly WEBSITE: string = 'https://www.u.gg';
    private readonly VERSION: string = '12.12.1';

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
                this.cache.writeCache(gamemode, champion, role, build);
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

            const runeId = $(r).attr('alt');
            const runeSrc = $(r).attr('src');
            if (!runeId || !runeSrc) throw new Error(`Failed to fetch rune index {${i}}`);

            const styleId = basename(runeSrc).replace('.webp', '').replace('.png', '').toLowerCase();
            const isSpecial = runeSrc.indexOf('assets/lol/runes') !== -1;
            const nameId = runeId
                .replace(/The Keystone /i, '')
                .replace(/The Rune /i, '')
                .toLocaleLowerCase();

            if (isSpecial) {
                if (runes.primaryStyleId) runes.subStyleId = parseInt(styleId);
                else runes.primaryStyleId = parseInt(styleId);

                return;
            }

            if (!perkMap.byName[nameId]) {
                if (!perkMap.byPic[styleId]) throw new Error(`Failed to map rune {${nameId}}`);
                runes.selectedPerkIds.push(perkMap.byPic[styleId]);
            } else {
                runes.selectedPerkIds.push(perkMap.byName[nameId]);
            }
        });

        return runes;
    }

    public async getItems($: any): Promise<ItemBlock[]> {
        const containers = $('.recommended-build_items.media-query_DESKTOP_MEDIUM__DESKTOP_LARGE');
        if (!containers) throw new Error(`Failed to get items`);

        const itemMap = await this.generateItemMap();

        const blocks: ItemBlock[] = [];

        blocks.push(this.getStartingItems($, containers, itemMap)); // Add starting items
        blocks.push(this.getCoreItems($, containers, itemMap)); // Add Mythic / core

        return blocks;
    }

    private async generateItemMap(): Promise<ItemMap> {
        const itemMap: ItemMap = {};

        return fetch(`https://static.u.gg/assets/lol/riot_static/${this.VERSION}/data/en_US/item.json`, {
            method: 'GET',
            headers: {
                'User-Agent': getAgent(),
                'Content-Type': 'application/json',
            },
        })
            .then((resp) => {
                if (!resp.ok) throw new Error(`Invalid response : ${resp.status}`);
                return resp.json();
            })
            .then((json: any) => {
                if (!json) throw new Error(`[U.op] Failed to get item schema`);
                const rawItems = json.data;

                let currentPage = 0;
                let itemRow: number[] = [];

                Object.keys(rawItems).forEach((itmID) => {
                    const pageId = `item${currentPage}.webp`;

                    itemRow.push(parseInt(itmID));
                    if (itemRow.length >= 10) {
                        if (!itemMap[pageId]) itemMap[pageId] = [];
                        itemMap[pageId].push(itemRow);

                        itemRow = [];
                        if (itemMap[pageId].length >= 10) {
                            currentPage++;
                        }
                    }
                });

                return itemMap;
            });
    }

    private getCoreItems($: any, startingContainer: any, itemMap: ItemMap): ItemBlock {
        const block: ItemBlock = {
            hideIfSummonerSpell: '',
            items: [],
            showIfSummonerSpell: '',
            type: 'Item Build',
        };

        const coreImgs = $(`.core-items .item-img > div > div`, startingContainer);
        coreImgs.each((o, el) => {
            const elm = $(el);
            if (!elm) return;

            const elmStyle = elm.attr('style').split(';');
            const item = this.atlasToItem(itemMap, elmStyle);
            if (!item) return;

            block.items.push(item);
        });

        //// ------
        const option1Imgs = $(`.item-options-1 .item-img > div > div`, startingContainer);
        let found: boolean = false;

        option1Imgs.each((o, el) => {
            if (found) return;

            const elm = $(el);
            if (!elm) return;

            const elmStyle = elm.attr('style').split(';');
            const item = this.atlasToItem(itemMap, elmStyle);
            if (!item) return;

            if (block.items.findIndex((itm) => itm.id === item.id) !== -1) return; // Already included

            block.items.push(item);
            found = true;
        });

        found = false;

        //// ------
        const option2Imgs = $(`.item-options-2 .item-img > div > div`, startingContainer);
        option2Imgs.each((o, el) => {
            if (found) return;
            const elm = $(el);
            if (!elm) return;

            const elmStyle = elm.attr('style').split(';');
            const item = this.atlasToItem(itemMap, elmStyle);
            if (!item) return;

            if (block.items.findIndex((itm) => itm.id === item.id) !== -1) return; // Already included
            block.items.push(item);
            found = true;
        });

        found = false;

        //// ------
        const option3Imgs = $(`.item-options-3 .item-img > div > div`, startingContainer);
        option3Imgs.each((o, el) => {
            if (found) return;
            const elm = $(el);
            if (!elm) return;

            const elmStyle = elm.attr('style').split(';');
            const item = this.atlasToItem(itemMap, elmStyle);
            if (!item) return;

            if (block.items.findIndex((itm) => itm.id === item.id) !== -1) return; // Already included
            block.items.push(item);
            found = true;
        });

        return block;
    }

    private getStartingItems($: any, startingContainer: any, itemMap: ItemMap): ItemBlock {
        const block: ItemBlock = {
            hideIfSummonerSpell: '',
            items: [],
            showIfSummonerSpell: '',
            type: 'Starting Items',
        };

        const images = $(`.starting-items .item-img > div > div`, startingContainer);
        images.each((o, el) => {
            const elm = $(el);
            if (!elm) return;

            const elmStyle = elm.attr('style').split(';');
            const item = this.atlasToItem(itemMap, elmStyle);
            if (!item) return;

            block.items.push(item);
        });

        return block;
    }

    private atlasToItem(itemMap: ItemMap, style: string[]): Item {
        let itemAtlasId: string = null;
        let itemAtlasIndex: number[] = [];

        style.forEach((attr) => {
            if (attr.indexOf('background-image') !== -1) {
                itemAtlasId = basename(attr.replace('background-image:url(', '').replace(')', ''));
            }

            if (attr.indexOf('background-position') !== -1) {
                itemAtlasIndex = attr
                    .replace('background-position:', '')
                    .replace(/px/g, '')
                    ?.split(' ')
                    ?.map((a) => -parseInt(a) / 48);
            }
        });

        if (!itemAtlasId || !itemAtlasIndex) throw new Error(`Failed to extract item atlas position`);

        // ROW - COL
        const itemAtlas = itemMap[itemAtlasId];
        if (!itemAtlas) throw new Error(`Failed to get item atlas ${itemAtlasId}`);

        const item = itemAtlas[itemAtlasIndex[1]][itemAtlasIndex[0]];
        if (!item) throw new Error(`Failed to get item ${itemAtlasIndex[1]}-${itemAtlasIndex[0]} on atlas ${itemAtlasId}`);

        return {
            id: item.toString(),
            count: 1,
        };
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
