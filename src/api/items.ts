import { createHttp1Request } from 'league-connect';
import { v4 as uuidv4 } from 'uuid';

import { CredentialsAPI } from './credentials';

import { ItemBuild, ItemSet } from '../types/itemSet';
import { MenuService } from '../services/menu';

export class ItemAPI {
    public static async getItemBuilds(): Promise<ItemBuild> {
        const user = CredentialsAPI.getUser();

        return createHttp1Request(
            {
                method: 'GET',
                url: `/lol-item-sets/v1/item-sets/${user.summonerId}/sets`,
            },
            CredentialsAPI.getToken(),
        )
            .then((resp) => {
                if (!resp.ok) throw new Error(`[ItemAPI] Failed to get item sets`);
                return resp.json();
            })
            .catch(() => null);
    }

    public static async validate(title: string): Promise<ItemBuild> {
        const user = CredentialsAPI.getUser();

        return createHttp1Request(
            {
                method: 'POST',
                url: `/lol-item-sets/v1/item-sets/${user.summonerId}/validate`,
                body: {
                    title: title,
                },
            },
            CredentialsAPI.getToken(),
        )
            .then((resp) => {
                if (!resp.ok) throw new Error(`[ItemAPI] Failed to get item sets`);
                return resp.json();
            })
            .catch(() => null);
    }

    public static async updateItemSet(set: ItemSet, index: number = 0): Promise<boolean> {
        const builds = await this.getItemBuilds();
        const user = CredentialsAPI.getUser();

        let hasAtleastABuild: boolean = true;
        if (!builds || !builds.itemSets || builds.itemSets.length <= 0) {
            MenuService.log(`[ItemAPI] No item build found, creating one..`);
            hasAtleastABuild = false;
        } else {
            MenuService.log(`[ItemAPI] Updating build index ${index}..`);
        }

        if (hasAtleastABuild) {
            set.uid = builds.itemSets[index].uid; // Hi-jack the selected index build.
        } else {
            set.uid = uuidv4();
        }

        const newBuild: ItemBuild = {
            accountId: user.accountId,
            itemSets: [set],
            timestamp: Math.floor(+new Date()),
        };

        return createHttp1Request(
            {
                method: hasAtleastABuild ? 'PUT' : 'POST',
                url: `/lol-item-sets/v1/item-sets/${user.summonerId}/sets`,
                body: hasAtleastABuild ? { ...newBuild } : { ...set },
            },
            CredentialsAPI.getToken(),
        )
            .then((resp) => {
                return resp.ok;
            })
            .catch((err) => {
                return false;
            });
    }
}
