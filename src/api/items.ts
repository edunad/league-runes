import { createHttp1Request } from 'league-connect';

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

    public static async createItemPage(): Promise<boolean> {
        const user = CredentialsAPI.getUser();

        return createHttp1Request(
            {
                method: 'POST',
                url: `/lol-item-sets/v1/item-sets/${user.summonerId}/sets`,
                body: {
                    title: 'TEMP',
                },
            },
            CredentialsAPI.getToken(),
        )
            .then((resp) => {
                return resp.ok;
            })
            .catch(() => {
                return false;
            });
    }

    public static async updateItemSet(set: ItemSet, index: number = 0): Promise<boolean> {
        let builds = await this.getItemBuilds();
        const user = CredentialsAPI.getUser();

        if (!builds || !builds.itemSets || builds.itemSets.length <= 0) {
            MenuService.log(`[ItemAPI] No item build found, creating one..`);

            await this.createItemPage();

            builds = await this.getItemBuilds();
            if (!builds || !builds.itemSets || builds.itemSets.length <= 0) throw new Error('Failed to create a item build page');
        }

        MenuService.log(`[ItemAPI] Updating build index ${index}..`);
        set.uid = builds.itemSets[index].uid; // Hi-jack the selected index build.

        const newBuild: ItemBuild = {
            accountId: user.accountId,
            itemSets: [set],
            timestamp: Math.floor(+new Date()),
        };

        return createHttp1Request(
            {
                method: 'PUT',
                url: `/lol-item-sets/v1/item-sets/${user.summonerId}/sets`,
                body: { ...newBuild },
            },
            CredentialsAPI.getToken(),
        )
            .then((resp) => {
                return resp.ok;
            })
            .catch(() => {
                return false;
            });
    }
}
