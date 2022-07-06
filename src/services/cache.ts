import { ensureDir, writeJson, readJson, stat } from 'fs-extra';

import { Build } from '../types/build';
import { Champion } from '../types/champion';
import { Gamemode } from '../types/gamemode';

export interface CacheData {
    build: Build;
    ttl: number;
}

export class CacheService {
    public readonly TTL: number = 60; // 1 min
    public pluginId: string;
    public cachePath: string;

    public constructor(pluginId: string) {
        this.pluginId = pluginId;
        this.cachePath = `./.cache/${pluginId}`;
    }

    public static async init(): Promise<any> {
        return ensureDir('.cache');
    }

    public async hasCache(gamemode: Gamemode, champion: Champion): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            stat(`${this.cachePath}/${gamemode}-${champion.name}.json`, (err) => {
                return resolve(!err ? true : false);
            });
        });
    }

    public async writeCache(gamemode: Gamemode, champion: Champion, build: Build): Promise<boolean> {
        await ensureDir(`${this.cachePath}`);
        return writeJson(`${this.cachePath}/${gamemode}-${champion.name}.json`, {
            build: build,
            ttl: Math.floor(+new Date()) + this.TTL * 1000,
        } as CacheData)
            .then(() => true)
            .catch(() => false);
    }

    public async readCache(gamemode: Gamemode, champion: Champion): Promise<CacheData | null> {
        const found = await this.hasCache(gamemode, champion);
        if (!found) return Promise.resolve(null);

        return readJson(`${this.cachePath}/${gamemode}-${champion.name}.json`)
            .then((data) => {
                if (!data) return null;
                if (data.ttl > Math.floor(+new Date())) {
                    return null;
                }

                return data;
            })
            .catch(() => null);
    }
}
