import { createHttp1Request } from 'league-connect';
import { Gamemode } from '../types/gamemode';
import { CredentialsAPI } from './credentials';

export type Maps = Record<Gamemode, number>;

export class MapAPI {
    public static async getMaps(): Promise<Maps> {
        return createHttp1Request(
            {
                method: 'GET',
                url: `/lol-maps/v1/maps`,
            },
            CredentialsAPI.getToken(),
        )
            .then((resp) => {
                if (!resp.ok) throw new Error(`[MapAPI] Failed to get maps`);
                return resp.json();
            })
            .then((json: any) => {
                const maps: Maps = { aram: 0, classic: 0, 'twisted-treeline': 0, urf: 0 };

                Object.values(json).forEach((map: any) => {
                    let name = map.gameMode.toLowerCase();
                    if (name === 'nexusblitz') name = 'urf';

                    maps[name] = map.id;
                });

                maps['practicetool'] = maps['classic']; // There is no 'practicetool' map, but it's basically classic
                return maps;
            })
            .catch(() => null);
    }
}
