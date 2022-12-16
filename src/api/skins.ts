import { createHttp2Request } from 'league-connect';
import { CredentialsAPI } from './credentials';

export interface Skin {
    id: number;
    name: string;
    ownership: {
        owned: boolean;
    };
}

export class SkinAPI {
    public static async getSkins(): Promise<Skin[] | null> {
        return createHttp2Request(
            {
                method: 'GET',
                url: `/lol-champ-select/v1/skin-carousel-skins`,
            },
            CredentialsAPI.getSession(),
            CredentialsAPI.getToken(),
        )
            .then((resp) => {
                if (!resp.ok) throw new Error(`[SkinAPI] Failed to get selected champion skins`);
                return resp.json();
            })
            .then((json: any) => {
                return Object.values(json).filter((skin: Skin) => skin.ownership.owned);
            })
            .catch(() => null);
    }

    public static async selectSkin(skin: Skin): Promise<boolean> {
        return createHttp2Request(
            {
                method: 'PATCH',
                url: `/lol-champ-select/v1/session/my-selection`,
                body: {
                    selectedSkinId: skin.id,
                },
            },
            CredentialsAPI.getSession(),
            CredentialsAPI.getToken(),
        )
            .then((resp) => resp.ok)
            .catch(() => false);
    }
}
