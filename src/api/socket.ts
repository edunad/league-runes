import { createWebSocketConnection, LeagueWebSocket } from 'league-connect';
import { EventEmitter } from 'events';

import { Gamemode } from '../types/gamemode';
import { Champion } from '../types/champion';

export class SocketAPI {
    public static ws: LeagueWebSocket;
    public static event: EventEmitter;

    public static async init(): Promise<boolean> {
        this.event = new EventEmitter();
        this.ws = await createWebSocketConnection({
            authenticationOptions: {
                awaitConnection: true,
            },
            pollInterval: 3000,
        }).catch((err) => {
            console.warn(`[CredentialsAPI] ${err}`);
            return null;
        });

        this.setupListeners();
        return Promise.resolve(this.ws != null);
    }

    private static setupListeners(): void {
        this.ws.subscribe('/lol-champ-select/v1/skin-selector-info', (data, event: any) => {
            if (event.eventType !== 'Create') return;

            this.event.emit('onChampSelected', {
                name: data.championName.toLowerCase().replace(/\s/g, '').replace("'", '').replace('.', '').replace('`', ''),
                originalName: data.championName,

                championId: data.selectedChampionId,
            } as Champion);
        });

        this.ws.subscribe('/lol-gameflow/v1/session', (data, event: any) => {
            if (event.eventType !== 'Update' && data.phase === 'ChampSelect') return;
            this.event.emit('onGamemodeUpdate', data.map.gameMode.toLowerCase() as Gamemode);
        });

        /*this.ws.on('message', (stream) => {
            console.log(stream);
        });*/
    }
}
