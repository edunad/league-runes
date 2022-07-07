import { createWebSocketConnection, LeagueWebSocket } from 'league-connect';
import { EventEmitter } from 'events';

import { CredentialsAPI } from './credentials';

import { Gamemode } from '../types/gamemode';
import { Champion } from '../types/champion';
import { Role } from '../types/role';

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

                avatarPic: `https://cdn.communitydragon.org/latest/champion/${data.selectedChampionId}/square.png`,
                championId: data.selectedChampionId,
            } as Champion);
        });

        this.ws.subscribe('/lol-champ-select/v1/session', (data, event: any) => {
            const current = CredentialsAPI.getUser();
            if (event.eventType !== 'Update') return;

            const player = data.myTeam.find((member) => member.summonerId === current.summonerId);
            if (!player) return;

            let role: Role = null;
            if (!player.assignedPosition) {
                if (player.spell1Id === 11 || player.spell2Id === 11) {
                    role = 'jungle';
                }
            } else {
                role = player.assignedPosition;
            }

            this.event.emit('onPlayerRoleUpdate', role);
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
