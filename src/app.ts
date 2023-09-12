import { ensureDir } from 'fs-extra';

import { CredentialsAPI } from './api/credentials';
import { ItemAPI } from './api/items';
import { MapAPI } from './api/map';
import { PerkAPI } from './api/perk';
import { SkinAPI } from './api/skins';
import { SocketAPI } from './api/socket';

import { MetaSRC } from './plugins/metasrc';
import { OPGG } from './plugins/opgg';
import { UGG } from './plugins/ugg';

import { CacheService } from './services/cache';
import { MenuService } from './services/menu';
import { SettingsService } from './services/settings';

import { Champion } from './types/champion';
import { Gamemode } from './types/gamemode';
import { ItemBlock, ItemSet } from './types/itemSet';
import { PerkData } from './types/perks';
import { Role } from './types/role';
import { RunePlugin } from './types/runePlugin';

export class App {
    public static gamemode: Gamemode = 'classic';
    public static champion: Champion | null = null;
    public static role: Role | null = null;

    public static plugins: { [id: string]: RunePlugin } = {
        ugg: new UGG(),
        metasrc: new MetaSRC(),
        opgg: new OPGG(),
    };

    public static init() {
        // Startup menu
        console.clear();
        console.log(`[Rune] Initializing....`);

        // God dam node
        const warning = process.emitWarning;
        process.emitWarning = (...args) => {
            if (args[2] === 'DEP0123') return;
            return warning.apply(process, args);
        };
        // -----

        // Create folder if not exist
        ensureDir(`${process.env.APPDATA}/rune`);

        // SETUP
        Promise.all([SettingsService.init(), CacheService.init(), CredentialsAPI.init(), SocketAPI.init(), MenuService.init()])
            .then(() => {
                this.registerEvents();

                // DEBUG PROVIDERS
                /*const provider = this.plugins['ugg'];
                provider
                    .getBuild(
                        'classic',
                        {
                            name: 'ashe',
                            originalName: 'ashe',
                            championId: 1,
                            avatarPic: '',
                        },
                        this.role,
                    )
                    .then((build) => {
                        //console.warn(build);
                    });*/
            })
            .catch((err) => console.error(`ERROR: ${err}`));
    }

    private static registerEvents(): void {
        SocketAPI.event.on('onChampSelected', (data: Champion) => {
            if (this.champion && this.champion.championId === data.championId) return;
            if (this.gamemode == null) this.gamemode = 'classic';

            this.champion = data;

            // Update menu ---
            MenuService.log(`[Runes] Champion ${data.originalName} for gamemode ${this.gamemode} detected!`);
            MenuService.setChampionAvatar(data.avatarPic);
            /// -----

            this.executeCommands();
        });

        SocketAPI.event.on('onChampClear', () => {
            if (this.champion == null) return;

            MenuService.log(`[Runes] Selection completed. Cleared champion`);
            this.champion = null;
        });

        SocketAPI.event.on('onGamemodeUpdate', (data: Gamemode) => {
            MenuService.log(`[Runes] Gamemode ${data} detected!`);
            this.gamemode = data;
        });

        SocketAPI.event.on('onPlayerRoleUpdate', (data: Role) => {
            this.role = data;
        });

        SocketAPI.event.on('onLobbyPhaseChange', (data: string) => {
            MenuService.setIngame(data === 'FINALIZATION');
        });

        MenuService.event.on('onRoleChange', (data: Role) => {
            this.role = data;
            this.autoBuildCommand();
        });
    }

    private static executeCommands(): void {
        if (SettingsService.getSetting('skin-enabled')) this.randomizeSkinCommand();
        if (SettingsService.getSetting('autoitems-enabled') || SettingsService.getSetting('autorunes-enabled')) this.autoBuildCommand();
    }

    private static autoBuildCommand(): void {
        const provider = this.plugins[SettingsService.getSetting('provider')];
        const buildName = `[${this.gamemode}]${this.role ? `[${this.role}]` : ''} ${this.champion.originalName.toUpperCase()}`;

        provider.getBuild(this.gamemode, this.champion, this.role).then((build) => {
            this.autoRunesCommand(buildName, build.perks);
            this.autoItemsCommand(buildName, build.items);
        });
    }

    private static autoRunesCommand(buildName: string, perks: PerkData): void {
        if (!SettingsService.getSetting('autorunes-enabled')) return;

        if (!perks) {
            MenuService.log(`[ERROR] Tried to update runes, but could not find them on provider!`);
            return;
        }

        MenuService.log(`[Runes] Updating runes...`);
        PerkAPI.getPages()
            .then((pages) => {
                PerkAPI.setPerks(pages[0], perks, buildName)
                    .then(() => {
                        MenuService.log(`[Runes] Updated runes!`);
                    })
                    .catch((err) => MenuService.log(err));
            })
            .catch((err) => MenuService.log(err));
    }

    private static autoItemsCommand(buildName: string, items: ItemBlock[]): void {
        if (!SettingsService.getSetting('autoitems-enabled')) return;

        if (!items || !items.length) {
            MenuService.log(`[ERROR] Tried to update items, but could not find them on provider!`);
            return;
        }

        MenuService.log(`[Runes] Updating items..`);
        MapAPI.getMaps()
            .then((maps) => {
                const itemSet: ItemSet = {
                    associatedChampions: [this.champion.championId],
                    associatedMaps: [maps[this.gamemode]],
                    blocks: [...items],
                    map: 'any',
                    mode: 'any',
                    preferredItemSlots: [],
                    sortrank: 0,
                    startedFrom: 'blank',
                    title: buildName,
                    type: 'custom',
                };

                ItemAPI.updateItemSet(itemSet)
                    .then(() => {
                        MenuService.log(`[Runes] Updated items!`);
                    })
                    .catch((err) => MenuService.log(err));
            })
            .catch((err) => MenuService.log(err));
    }

    private static randomizeSkinCommand(): void {
        MenuService.log(`[Runes] Randomizing skin..`);

        SkinAPI.getSkins()
            .then((skins) => {
                SkinAPI.selectSkin(skins.length == 1 ? skins[0] : skins[Math.getRandom(1, skins.length - 1)]);
            })
            .catch((err) => MenuService.log(err));
    }
}
