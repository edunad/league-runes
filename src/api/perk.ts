import { createHttp2Request } from 'league-connect';
import { basename } from 'path';

import { PerkData } from '../types/perks';
import { CredentialsAPI } from './credentials';

export interface PerkMap {
    byName: { [img: string]: number };
    byPic: { [img: string]: number };
}

export interface RunePage {
    autoModifiedSelections: number;
    current: boolean;
    id: number;
    isActive: boolean;

    isDeletable: boolean;
    isEditable: boolean;
    isValid: boolean;

    lastModified: number;

    name: string;
    order: number;
    primaryStyleId: number;
    selectedPerkIds: number[];
    subStyleId: number;
}

export class PerkAPI {
    public static async getPerks(): Promise<PerkMap> {
        return createHttp2Request(
            {
                method: 'GET',
                url: '/lol-perks/v1/perks',
            },
            CredentialsAPI.getSession(),
            CredentialsAPI.getToken(),
        )
            .then((val) => val.json())
            .then((json) => {
                const perkMap: PerkMap = {
                    byName: {},
                    byPic: {},
                };

                Object.values(json).forEach((perk: any) => {
                    perkMap.byName[perk.name.toLowerCase()] = perk.id;
                    perkMap.byPic[basename(perk.iconPath).toLowerCase().replace('.png', '')] = perk.id;
                });

                return perkMap;
            })
            .catch(() => null);
    }

    public static async getPages(): Promise<RunePage[]> {
        return createHttp2Request(
            {
                method: 'GET',
                url: `/lol-perks/v1/pages`,
            },
            CredentialsAPI.getSession(),
            CredentialsAPI.getToken(),
        )
            .then((val) => val.json())
            .catch(() => null);
    }

    public static async validatePage(page: RunePage): Promise<boolean> {
        return createHttp2Request(
            {
                method: 'PUT',
                url: `/lol-perks/v1/pages/validate`,
                body: {
                    id: page.id,
                },
            },
            CredentialsAPI.getSession(),
            CredentialsAPI.getToken(),
        )
            .then((resp) => resp.ok)
            .catch(() => false);
    }

    public static async setPerks(page: RunePage, perks: PerkData, name?: string): Promise<boolean> {
        return await createHttp2Request(
            {
                method: 'PUT',
                url: `/lol-perks/v1/pages/${page.id}`,
                body: { ...page, ...perks, name: name },
            },
            CredentialsAPI.getSession(),
            CredentialsAPI.getToken(),
        )
            .then((resp) => {
                return resp.ok;
            })
            .catch(() => null);
    }
}
