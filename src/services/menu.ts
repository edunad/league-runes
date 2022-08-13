//import inquirer from 'inquirer';
//import { toAnsii } from 'terminal-art';

import inquirer from 'inquirer';
import { EventEmitter } from 'events';

import { Role } from '../types/role';
import { SettingsService } from './settings';

export class MenuService {
    private static readonly DISABLE_LOG: boolean = false;

    private static readonly MAX_LOG: number = 7;

    private static championAvatar: string;
    private static logger: string[];

    private static mainmenu: any;
    private static roleMenu: any;

    public static event: EventEmitter;

    public static init(): void {
        this.event = new EventEmitter();
        this.logger = [];

        this.printMenu();
    }

    public static setIngame(ingame: boolean): void {
        ingame ? this.printRole() : this.printMenu();
    }

    public static log(text: string): void {
        if (this.logger.length >= this.MAX_LOG) this.logger.shift();
        this.logger.push(text);

        this.printLog();
    }

    public static async clear(): Promise<void> {
        if (this.DISABLE_LOG) return Promise.resolve();

        console.clear();
        await this.printLog();
    }

    private static printLog(): Promise<void> {
        if (this.DISABLE_LOG) return Promise.resolve();

        return new Promise<void>((res) => {
            process.stdout.cursorTo(0, 10, () => {
                process.stdout.clearScreenDown(() => {
                    this.logger.forEach((log, indx) => {
                        if (indx > this.MAX_LOG) return;
                        console.log(log);
                    });

                    process.stdout.cursorTo(0, 0, () => {
                        if (this.mainmenu) global.__forceCheckboxRender();
                        if (this.roleMenu) global.__forceListRender();
                        res();
                    });
                });
            });
        });
    }

    public static setChampionAvatar(champion: string): void {
        this.championAvatar = champion;
    }

    private static killMenus(): void {
        // Cancel both UI's
        if (this.mainmenu) {
            this.mainmenu.ui.activePrompt.close();
            this.mainmenu.ui.rl.output.end();
            this.mainmenu.ui.rl.removeAllListeners();

            this.mainmenu = null;
        }

        if (this.roleMenu) {
            this.roleMenu.ui.activePrompt.close();
            this.roleMenu.ui.rl.output.end();
            this.roleMenu.ui.rl.removeAllListeners();

            this.roleMenu = null;
        }
    }

    private static printRole(): void {
        if (this.DISABLE_LOG || this.roleMenu) return; // Already opened?

        this.killMenus();
        this.clear().then(() => {
            process.stdout.cursorTo(0, 0, () => {
                this.roleMenu = inquirer.prompt([
                    {
                        type: 'list',
                        message: `INGAME - OVERRIDE ROLE`,
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

                    this.event.emit('onRoleChange', data.role as Role);
                    this.roleMenu = null;

                    this.printRole();
                });
            });
        });
    }

    private static printMenu(): void {
        if (this.DISABLE_LOG || this.mainmenu) return; // Already opened?

        this.killMenus();
        this.clear().then(() => {
            process.stdout.cursorTo(0, 0, () => {
                this.mainmenu = inquirer.prompt([
                    {
                        type: 'checkbox',
                        message: 'MAINMENU -- SETTINGS',
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
                        onEvent: (key, data) => {
                            SettingsService.setSetting('skin-enabled', data.indexOf('skin-enabled') !== -1, false);
                            SettingsService.setSetting('skin-chroma-enabled', data.indexOf('skin-chroma-enabled') !== -1, false);
                            SettingsService.setSetting('autorunes-enabled', data.indexOf('autorunes-enabled') !== -1, false);
                            SettingsService.setSetting('autoitems-enabled', data.indexOf('autoitems-enabled') !== -1, true);
                        },
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
            });
        });
    }
}
