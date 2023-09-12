'use strict';

import { readJson, writeJson, stat } from 'fs-extra';

const CURRENT_VERSION: any = { version: 'v0.0.5', requireClean: true };

export class SettingsService {
    private static currentSettings: any = SettingsService.getDefaultSettings();
    private static readonly SETTINGS_LOCATION: string = `${process.env.APPDATA}/rune`;

    public static async init(): Promise<void> {
        const settings = await this.hasSettings();
        if (!settings) return;

        const data = await readJson(`${SettingsService.SETTINGS_LOCATION}/settings.json`);
        if (data == null) return;

        if (data.version != CURRENT_VERSION.version && CURRENT_VERSION.requireClean) {
            this.currentSettings = this.getDefaultSettings();
        } else {
            this.currentSettings = data;
        }
    }

    public static async hasSettings(): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            stat(`${SettingsService.SETTINGS_LOCATION}/settings.json`, (err) => {
                return resolve(!err ? true : false);
            });
        });
    }

    public static getSetting(key: string): any {
        return this.currentSettings[key];
    }

    public static async setSetting(key: string, val: any, save: boolean = true): Promise<void> {
        this.currentSettings[key] = val;
        if (save) await this.saveSettings();
    }

    public static async resetSettings(): Promise<void> {
        this.currentSettings = this.getDefaultSettings();
        await this.saveSettings();
    }

    public static async saveSettings(): Promise<void> {
        await writeJson(`${SettingsService.SETTINGS_LOCATION}/settings.json`, this.currentSettings);
    }

    private static getDefaultSettings(): any {
        return {
            version: CURRENT_VERSION.version,
            provider: 'metasrc',

            'skin-enabled': true,
            'skin-chroma-enabled': true,

            'autorunes-enabled': true,
            'autoitems-enabled': true,
        };
    }
}
