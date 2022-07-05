import { createHttp1Request } from 'league-connect';
import { basename } from 'path';

import { PerkData } from '../types/perks';
import { CredentialsAPI } from './credentials';

export interface PerkMap {
    [img: string]: number;
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
        return createHttp1Request(
            {
                method: 'GET',
                url: '/lol-perks/v1/perks',
            },
            CredentialsAPI.getToken(),
        )
            .then((val) => val.json())
            .then((json) => {
                const perkMap: PerkMap = {};
                Object.values(json).forEach((perk: any) => {
                    const iconId: string = basename(perk.iconPath).toLowerCase();
                    perkMap[iconId] = perk.id;
                });

                return perkMap;
            })
            .catch(() => null);
    }

    public static async getPages(): Promise<RunePage[]> {
        return createHttp1Request(
            {
                method: 'GET',
                url: `/lol-perks/v1/pages`,
            },
            CredentialsAPI.getToken(),
        )
            .then((val) => val.json())
            .catch(() => null);
    }

    public static async validatePage(page: RunePage): Promise<boolean> {
        return createHttp1Request(
            {
                method: 'PUT',
                url: `/lol-perks/v1/pages/validate`,
                body: {
                    id: page.id,
                },
            },
            CredentialsAPI.getToken(),
        )
            .then((resp) => resp.ok)
            .catch(() => false);
    }

    public static async setPerks(page: RunePage, perks: PerkData, name?: string): Promise<boolean> {
        return await createHttp1Request(
            {
                method: 'PUT',
                url: `/lol-perks/v1/pages/${page.id}`,
                body: { ...page, ...perks, name: name },
            },
            CredentialsAPI.getToken(),
        )
            .then((resp) => {
                return resp.ok;
            })
            .catch(() => null);
    }
}
