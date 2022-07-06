import './src/extensions/math';

import { CredentialsAPI } from './src/api/credentials';
import { SocketAPI } from './src/api/socket';
import { PerkAPI } from './src/api/perk';
import { SkinAPI } from './src/api/skins';
import { MapAPI } from './src/api/map';
import { ItemAPI } from './src/api/items';

import { MetaSRC } from './src/plugins/metasrc';
import { OPGG } from './src/plugins/opgg';
import { UGG } from './src/plugins/ugg';

import { CacheService } from './src/services/cache';
import { MenuService } from './src/services/menu';
import { SettingsService } from './src/services/settings';

import { Gamemode } from './src/types/gamemode';
import { RunePlugin } from './src/types/runePlugin';
import { Champion } from './src/types/champion';
import { ItemSet } from './src/types/itemSet';

const plugins: { [id: string]: RunePlugin } = {
    opgg: new OPGG(),
    metasrc: new MetaSRC(),
    ugg: new UGG(),
};

const main = async () => {
    console.warn(`\n---- INITIALIZING RUNES -----`);
    process.stdout.write(`Waiting for league client...`);

    await SettingsService.init();
    await CacheService.init();
    await CredentialsAPI.init();
    await SocketAPI.init();

    process.stdout.write(`  OK\n`);
    await new Promise((res) => setTimeout(res, 1000));

    // Startup menu
    MenuService.init();

    /*const provider = plugins['metasrc'];
    const runes = await provider.getBuild('aram', {
        name: 'jinx',
        originalName: 'Jinx',

        championId: 0,
    });

    const items = await ItemAPI.updateItemSet({
        associatedChampions: [53],
        associatedMaps: [],
        blocks: [...runes.items],
        map: 'any',
        mode: 'any',
        preferredItemSlots: [],
        sortrank: 0,
        startedFrom: 'blank',
        title: 'Blitz test',
        type: 'custom',
    });

    console.warn(items);*/

    /// -------
    let gamemode: Gamemode = 'classic';
    let champion: Champion | null = null;

    SocketAPI.event.on('onChampSelected', (data: Champion) => {
        champion = data;

        // Update menu ---
        MenuService.log(`[Runes] Champion ${data.originalName} for gamemode ${gamemode} detected!`);
        MenuService.setChampion(data);
        /// -----

        if (SettingsService.getSetting('skin-enabled')) {
            MenuService.log(`[Runes] Randomizing skin..`);

            SkinAPI.getSkins()
                .then((skins) => {
                    SkinAPI.selectSkin(skins.length == 1 ? skins[0] : skins[Math.getRandom(1, skins.length - 1)]);
                })
                .catch((err) => MenuService.log(err));
        }

        /// ----
        if (SettingsService.getSetting('autorunes-enabled') || SettingsService.getSetting('autoitems-enabled')) {
            const provider = plugins[SettingsService.getSetting('provider')];
            const buildName = `[${gamemode}] ${champion.originalName.toUpperCase()}`;

            MenuService.log(`[Runes] Gathering build from ${provider.pluginId} - ${gamemode} | ${champion.originalName}`);

            provider
                .getBuild(gamemode, champion)
                .then((build) => {
                    if (SettingsService.getSetting('autorunes-enabled')) {
                        MenuService.log(`[Runes] Updating runes..`);

                        if (!build.perks) MenuService.log(`[Runes] Tried to update runes, but could not find them on provider!`);
                        else {
                            PerkAPI.getPages()
                                .then((pages) => {
                                    PerkAPI.setPerks(pages[0], build.perks, buildName)
                                        .then(() => {
                                            MenuService.log('[Runes] Updated runes!');
                                        })
                                        .catch((err) => MenuService.log(err));
                                })
                                .catch((err) => MenuService.log(err));
                        }
                    }

                    /// ----
                    if (SettingsService.getSetting('autoitems-enabled')) {
                        if (build.items.length <= 0) MenuService.log(`[Runes] Tried to update items, but could not find them on provider!`);
                        else {
                            MenuService.log(`[Runes] Updating items..`);
                            MapAPI.getMaps()
                                .then((maps) => {
                                    const itemSet: ItemSet = {
                                        associatedChampions: [champion.championId],
                                        associatedMaps: [maps[gamemode]],
                                        blocks: [...build.items],
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
                                            MenuService.log('[Runes] Updated items!');
                                        })
                                        .catch((err) => MenuService.log(err));
                                })
                                .catch((err) => MenuService.log(err));
                        }
                    }
                })
                .catch((err) => MenuService.log(err));
        }
    });

    SocketAPI.event.on('onGamemodeUpdate', (data: Gamemode) => {
        gamemode = data;
    });
};

process.on('unhandledRejection', (reason: any) => console.warn(`!!FATAL!! ${reason}`));
process.on('SIGTERM', () => {
    CredentialsAPI.shutdown();
});

main().catch((err) => console.warn(`!!FATAL!! ${err}`));
