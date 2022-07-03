'use strict';

/*
* Copyright © Mythical Rawr 2014-2019
* Authors: Eduardo de Sousa Fernandes
* Website: www.failcake.me
*/

import { load } from 'cheerio';
import {request} from 'request-promise';

import { getAgent } from '../utils/urlUtil';

export class MetaSRC {
    private static readonly WEBSITE: string = 'https://www.metasrc.com';

    public static getChampion(champion: string): Promise<void> {
        const gamemode: string = 'aram';
        return request({
            method: 'GET',
            uri: `${this.WEBSITE}/${gamemode}/champion/${champion}`,
            headers: {
                'User-Agent': getAgent(true),
                'Content-Type': 'application/text'
            },
            transform: (body) => {
                return load(body);
            }
        }).then(($) => {
            if ($ == null) return Promise.reject('Failed to get champion');
            console.warn($('#perks').children());

            return Promise.resolve();
        });
    }
}