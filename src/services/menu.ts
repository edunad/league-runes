//import inquirer from 'inquirer';
//import { toAnsii } from 'terminal-art';

import inquirer from 'inquirer';
import { EventEmitter } from 'events';

import { Role } from '../types/role';
import { SettingsService } from './settings';

export class MenuService {
    private static championAvatar: string;
    private static logger: string[];

    private static mainmenu: any;
    private static roleMenu: any;
    private static bar: inquirer.ui.BottomBar;

    public static event: EventEmitter;

    public static init(): void {
        this.event = new EventEmitter();
        this.bar = new inquirer.ui.BottomBar();
        this.logger = [];

        this.printMenu();
    }

    public static setIngame(ingame: boolean): void {
        ingame ? this.printRole() : this.printMenu();
    }

    public static log(text: string): void {
        if (this.logger.length > 4) this.logger.shift();
        this.logger.push(text);

        this.printLog();
    }

    public static clear(): void {
        console.clear();
        this.printLog();
    }

    private static printLog(): void {
        this.logger.forEach((log, indx) => {
            if (indx > 4) return;
            this.bar.log.write(log);
        });
    }

    public static setChampionAvatar(champion: string): void {
        this.championAvatar = champion;
    }

    private static killMenus(): void {
        // Cancel both UI's
        if (this.mainmenu) {
            this.mainmenu.ui.activePrompt.close();
            this.mainmenu.ui.rl.removeAllListeners();

            this.mainmenu = null;
        }

        if (this.roleMenu) {
            this.roleMenu.ui.activePrompt.close();
            this.roleMenu.ui.rl.removeAllListeners();

            this.roleMenu = null;
        }
    }

    private static printRole(): void {
        if (this.roleMenu) return; // Already opened?

        this.killMenus();
        this.clear();

        console.log(`------------------ CHAMPION SELECT ------------------`);
        this.roleMenu = inquirer.prompt([
            {
                type: 'rawlist',
                message: `Override role`,
                name: 'role',
                choices: [
                    {
                        name: 'DEFAULT - META',
                        value: null,
                    },
                    new inquirer.Separator(' ===='),
                    {
                        name: 'JUNGLE',
                        value: 'jungle',
                    },
                    {
                        name: 'TOP',
                        value: 'top',
                    },
                    {
                        name: 'MIDDLE',
                        value: 'middle',
                    },
                    {
                        name: 'BOTTOM (ADC)',
                        value: 'bottom',
                    },
                    {
                        name: 'SUPPORT',
                        value: 'support',
                    },
                ],
            },
        ]);

        this.roleMenu.then((data) => {
            if (!data) return;

            this.roleMenu = null;
            this.printRole();

            this.event.emit('onRoleChange', data.role as Role);
        });
    }

    private static printMenu(): void {
        if (this.mainmenu) return; // Already opened?

        this.killMenus();
        this.clear();

        console.log(`--------------------- MAIN MENU ---------------------`);
        this.mainmenu = inquirer.prompt([
            {
                type: 'checkbox',
                message: 'Settings',
                name: 'settings',
                choices: [
                    new inquirer.Separator('SKINS ===='),
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
                    new inquirer.Separator('AUTO ===='),
                    {
                        name: '  Enable Auto-Runes',
                        value: 'autorunes-enabled',
                        checked: SettingsService.getSetting('autorunes-enabled'),
                    },
                    {
                        name: '  Enable Auto-Items',
                        value: 'autoitems-enabled',
                        checked: SettingsService.getSetting('autoitems-enabled'),
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
        ]);

        this.mainmenu.then((data) => {
            if (!data) return;

            SettingsService.setSetting('skin-enabled', data.settings.indexOf('skin-enabled') !== -1, false);
            SettingsService.setSetting('skin-chroma-enabled', data.settings.indexOf('skin-chroma-enabled') !== -1, false);
            SettingsService.setSetting('autorunes-enabled', data.settings.indexOf('autorunes-enabled') !== -1, false);
            SettingsService.setSetting('autoitems-enabled', data.settings.indexOf('autoitems-enabled') !== -1, false);

            SettingsService.setSetting('provider', data.providers);

            this.mainmenu = null;
            this.printMenu();
        });
    }
}
