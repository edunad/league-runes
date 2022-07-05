import './src/extensions/math';

import { CredentialsAPI } from './src/api/credentials';
import { SocketAPI } from './src/api/socket';
import { PerkAPI } from './src/api/perk';
import { SkinAPI } from './src/api/skins';

import { MetaSRC } from './src/plugins/metasrc';
import { OPGG } from './src/plugins/opgg';
import { UGG } from './src/plugins/ugg';

import { CacheService } from './src/services/cache';
import { MenuService } from './src/services/menu';
import { SettingsService } from './src/services/settings';

import { Gamemode } from './src/types/gamemode';
import { RunePlugin } from './src/types/runePlugin';
import { Champion } from './src/types/champion';

const plugins: { [id: string]: RunePlugin } = {
    opgg: new OPGG(),
    metasrc: new MetaSRC(),
    ugg: new UGG(),
};

const main = async () => {
    await SettingsService.init();
    await CacheService.init();
    await CredentialsAPI.init();
    await SocketAPI.init();

    // Startup menu
    MenuService.init();

    /*
    const provider = plugins['ugg'];
    const runes = await provider.getRunes('classic', {
        name: 'jinx',
        originalName: 'jinx',

        championId: 0,
    });

    console.warn(runes);
    throw new Error('test');
    */

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
        if (SettingsService.getSetting('autorune-enabled')) {
            const provider = plugins[SettingsService.getSetting('provider')];

            MenuService.log(`[Runes] Gathering runes from ${provider.pluginId} - ${gamemode} | ${champion.originalName}`);

            Promise.all([PerkAPI.getPages(), provider.getRunes(gamemode, champion)])
                .then((data) => {
                    PerkAPI.setPerks(data[0][0], data[1], `[${gamemode}] ${champion.originalName.toUpperCase()}`).then(() => {
                        MenuService.log('[Runes] Updated runes!');
                    });
                })
                .catch((err) => MenuService.log(err));
        }
    });

    SocketAPI.event.on('onGamemodeUpdate', (data: Gamemode) => {
        gamemode = data;
    });
};

process.on('unhandledRejection', (reason: any) => console.warn(`!!FATAL!! ${reason}`));
main().catch((err) => console.warn(`!!FATAL!! ${err}`));
