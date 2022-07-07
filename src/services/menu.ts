import blessed from 'reblessed';
import { toAnsii } from 'terminal-art';

import { Champion } from '../types/champion';
import { SettingsService } from './settings';

export class MenuService {
    private static champion: Champion;
    private static screen: blessed.Widgets.Screen;

    private static logger: any;
    private static champPic: any;

    public static init(): void {
        this.screen = blessed.screen({
            title: 'RUNES =====',
            /*autoPadding: true,
            resizeTimeout: 300,
            smartCSR: true,
            warnings: false,
            errors: true,*/
        });

        this.screen.key(['C-c'], () => {
            process.exit(0);
        });

        this.title();
        this.main();
    }

    public static log(title: string, text: string): void {
        if (!this.logger) return;

        this.logger.log(`{#0fe1ab-fg}%s{/}: {bold}%s{/bold}`, title, text);
        this.screen.render();
    }

    public static customLog(text: string): void {
        if (!this.logger) return;

        this.logger.log(text);
        this.screen.render();
    }

    public static setChampionAvatar(championPic: string): Promise<void> {
        if (!this.champPic) return Promise.resolve();

        return toAnsii(championPic, {
            maxCharWidth: 29,
        })
            .then((art) => {
                if (!this.champPic || !this.screen) return;

                this.champPic.content = art;
                this.screen.render();
            })
            .catch((err) => console.warn(err));
    }

    private static title(): void {
        if (!this.screen) return;

        // Tittle screen
        this.screen.append(
            blessed.text({
                top: 0,
                left: 0,
                width: '100%',
                content: ' {bold}RUNES ====={/bold}',
                tags: true,
                align: 'center',
            }),
        );

        this.screen.append(
            blessed.line({
                orientation: 'horizontal',
                top: 1,
                left: 0,
                right: 0,
            }),
        );

        this.screen.render();
    }

    private static main(): void {
        if (!this.screen) return;

        // CHAMPION RENDER ----
        const picBox = blessed.box({
            parent: this.screen,
            left: '38%',
            top: 2,
            width: 30,
            height: 13, // 40%
        });

        this.champPic = blessed.text({
            parent: picBox,
            top: 0,
            left: 'center',
            width: 28,
            height: '100%',
            content: '',
        });
        // ----

        const button = blessed.button({
            //content: 'Click me!',
            parent: this.screen,
            content: 'Click\nme!',
            shrink: true,
            mouse: true,
            border: 'line',
            style: {
                fg: 'red',
                bg: 'blue',
            },
            //height: 3,
            left: 1,
            //bottom: 6,
            top: 3,
            padding: 0,
        });

        button.on('press', function () {
            button.setContent('Clicked!');
            this.screen.render();
        });

        // LOGGER ----
        this.logger = blessed.log({
            parent: this.screen,
            bottom: 0,
            right: 0,
            width: '50%',
            height: '100%',
            border: 'line',
            tags: true,
            keys: false,
            mouse: false,
            vi: true,
            scrollback: 100,
            label: 'LOG',
            scrollbar: {
                ch: '#',
                track: {
                    bg: '#34495e',
                },
                style: {
                    inverse: true,
                },
            },
        });
        // ---

        this.screen.render();
    }
}
