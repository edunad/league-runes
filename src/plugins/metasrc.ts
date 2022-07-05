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

    public async getRunes(gamemode: Gamemode, champion: Champion): Promise<PerkData> {
        // Check cache first
        const cachedPerks = await this.cache.readCache(gamemode, champion);
        if (cachedPerks) {
            MenuService.log(`[MetaSRC] Using cached data: ${gamemode} - ${champion}`);
            return cachedPerks.perks;
        }
        // ---

        const perkMap = await PerkAPI.getPerks();
        const runes: PerkData = {
            selectedPerkIds: [],
        };

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
                if (!resp.ok) throw new Error(`[MetaSRC] Invalid response : ${resp.status}`);
                return resp.text();
            })
            .then((data) => {
                return load(data);
            })
            .then(($) => {
                if ($ == null) return Promise.reject('Failed to get champion');

                const runeContainer = $('#perks > div:last-child > .content-selected svg > image');
                if (!runeContainer) throw new Error(`[MetaSRC] Failed to get runes`);

                runeContainer.each((i, r) => {
                    const runeId = $(r).attr('data-xlink-href');
                    if (!runeId) throw new Error(`[MetaSRC] Failed to fetch rune index {${i}}`);

                    const picId = basename(runeId).toLocaleLowerCase();
                    const isSpecial = runeId.indexOf('metasrc.com') !== -1;

                    if (isSpecial) {
                        const styleId = parseInt(picId.replace('.png', ''));

                        if (runes.primaryStyleId) runes.subStyleId = styleId;
                        else runes.primaryStyleId = styleId;

                        return;
                    }

                    if (!perkMap[picId]) throw new Error(`[MetaSRC] Failed to map rune {${picId}}`);
                    runes.selectedPerkIds.push(perkMap[picId]);
                });

                return runes;
            })
            .then((runes) => {
                if (!runes.primaryStyleId || !runes.subStyleId || runes.selectedPerkIds.length <= 0)
                    throw new Error(`[MetaSRC] No runes found for {${champion.originalName}}`);
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
