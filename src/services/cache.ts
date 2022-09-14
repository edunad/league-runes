import { ensureDir, writeJson, readJson, stat } from 'fs-extra';

import { Build } from '../types/build';
import { Champion } from '../types/champion';
import { Gamemode } from '../types/gamemode';
import { Role } from '../types/role';

import { MenuService } from './menu';

export interface CacheData {
    build: Build;
    ttl: number;

    version: string;
}

export class CacheService {
    public static readonly CACHE_VERSION: string = '0.0.3';
    public static readonly CACHE_LOCATION: string = `${process.env.APPDATA}/rune/cache`;

    public readonly TTL: number = 2;
    public pluginId: string;
    public cachePath: string;

    public constructor(pluginId: string) {
        this.pluginId = pluginId;
        this.cachePath = `${CacheService.CACHE_LOCATION}/${pluginId}`;
    }

    public static async init(): Promise<any> {
        return ensureDir(CacheService.CACHE_LOCATION);
    }

    public async hasCache(gamemode: Gamemode, champion: Champion, role: Role): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            stat(`${this.cachePath}/${gamemode}-${champion.name}-${role ? role : 'default'}.json`, (err) => {
                return resolve(!err ? true : false);
            });
        });
    }

    public async writeCache(gamemode: Gamemode, champion: Champion, role: Role, build: Build): Promise<boolean> {
        await ensureDir(`${this.cachePath}`);
        return writeJson(`${this.cachePath}/${gamemode}-${champion.name}-${role ? role : 'default'}.json`, {
            build: build,
            ttl: Math.floor(+new Date()) + this.TTL * 1000,

            version: CacheService.CACHE_VERSION,
        } as CacheData)
            .then(() => {
                MenuService.log(`[Cache][${this.pluginId}] ${gamemode}-${champion.name}-${role ? role : 'default'}.json cached!`);
                return true;
            })
            .catch(() => false);
    }

    public async readCache(gamemode: Gamemode, champion: Champion, role: Role): Promise<CacheData | null> {
        const found = await this.hasCache(gamemode, champion, role);
        if (!found) return Promise.resolve(null);

        return readJson(`${this.cachePath}/${gamemode}-${champion.name}-${role ? role : 'default'}.json`)
            .then((data) => {
                if (!data) return null;
                if (!data.version || data.version !== CacheService.CACHE_VERSION) {
                    MenuService.log(
                        `[Cache][${this.pluginId}] ${gamemode}-${champion.name}-${
                            role ? role : 'default'
                        }.json outdated version. Re-fetching..`,
                    );

                    return null;
                }

                if (data.ttl > Math.floor(+new Date())) {
                    MenuService.log(
                        `[Cache][${this.pluginId}] ${gamemode}-${champion.name}-${
                            role ? role : 'default'
                        }.json cache expired. Re-fetching..`,
                    );

                    return null;
                }

                MenuService.log(`[Cache][${this.pluginId}] Using cached data ${gamemode}-${champion.name}-${role ? role : 'default'}.json`);
                return data;
            })
            .catch(() => null);
    }
}
