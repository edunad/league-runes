'use strict';

import { readJson, writeJson, stat } from 'fs-extra';

const CURRENT_VERSION: any = { version: 'v0.0.3', requireClean: true };

export class SettingsService {
    private static currentSettings: any = SettingsService.getDefaultSettings();

    public static async init(): Promise<void> {
        const settings = await this.hasSettings();
        if (!settings) return;

        const data = await readJson('./settings.json');
        if (data == null) return;

        if (data.version != CURRENT_VERSION.version && CURRENT_VERSION.requireClean) {
            this.currentSettings = this.getDefaultSettings();
        } else {
            this.currentSettings = data;
        }
    }

    public static async hasSettings(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            stat(`./settings.json`, (err) => {
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
        await writeJson('./settings.json', this.currentSettings);
    }

    private static getDefaultSettings(): any {
        return {
            version: CURRENT_VERSION.version,
            provider: 'uop',

            'skin-enabled': true,
            'skin-chroma-enabled': true,

            'autorune-enabled': true,
        };
    }
}
