import { prompt, Separator, ui } from 'inquirer';
import { toAnsii } from 'terminal-art';

import { Champion } from '../types/champion';
import { SettingsService } from './settings';

export class MenuService {
    private static champion: Champion;
    private static logger: ui.BottomBar;

    public static init(): void {
        this.logger = new ui.BottomBar();
        this.printMenu();
    }

    public static log(text: string): void {
        this.logger.log.write(text);
    }

    public static setChampion(champion): void {
        this.champion = champion;
        //this.printChampion();
    }

    private static printChampion(): Promise<void> {
        if (!this.champion) return Promise.resolve();
        return toAnsii(`https://ddragon.leagueoflegends.com/cdn/12.12.1/img/champion/Blitzcrank.png`, {
            maxCharWidth: 100,
        })
            .then((art) => {
                process.stdout.cursorTo(40, 0);
                console.log(art);
            })
            .catch((err) => console.warn(err));
    }

    private static printMenu(): void {
        console.clear();
        console.log('------------------------------------------------------');
        //this.printChampion();

        prompt([
            {
                type: 'checkbox',
                message: 'Settings',
                name: 'settings',
                choices: [
                    new Separator('SKINS'),
                    {
                        name: '  Enable random skin',
                        value: 'skin-enabled',
                        checked: SettingsService.getSetting('skin-enabled'),
                    },
                    {
                        name: '  Enable random chroma skin',
                        value: 'skin-chroma-enabled',
                        checked: SettingsService.getSetting('skin-chroma-enabled'),
                    },
                    new Separator('RUNES'),
                    {
                        name: '  Enable Auto-Runes',
                        value: 'autorune-enabled',
                        checked: SettingsService.getSetting('autorune-enabled'),
                    },
                ],
            },
            {
                type: 'list',
                message: `Providers - Picked: ${SettingsService.getSetting('provider')}`,
                name: 'providers',
                choices: [
                    {
                        name: 'U.GG',
                        value: 'ugg',
                    },
                    {
                        name: 'MetaSRC',
                        value: 'metasrc',
                    },
                    {
                        name: 'OP.GG (Bit broken / not recommented :S)',
                        value: 'opgg',
                    },
                ],
            },
        ]).then((data) => {
            SettingsService.setSetting('skin-enabled', data.settings.indexOf('skin-enabled') !== -1, false);
            SettingsService.setSetting('skin-chroma-enabled', data.settings.indexOf('skin-chroma-enabled') !== -1, false);
            SettingsService.setSetting('autorune-enabled', data.settings.indexOf('autorune-enabled') !== -1, false);

            SettingsService.setSetting('provider', data.providers);
            this.printMenu();
        });

        console.log(`\n\n--------------------- LOGS ---------------------\n`);
    }
}
