import { createWebSocketConnection, LeagueWebSocket } from 'league-connect';
import { EventEmitter } from 'events';

import { CredentialsAPI } from './credentials';

import { Gamemode, isSupportedGamemode } from '../types/gamemode';
import { Champion } from '../types/champion';
import { Role } from '../types/role';

export class SocketAPI {
    public static ws: LeagueWebSocket;
    public static event: EventEmitter;

    private static prevPhase: string;
    private static prevGamemode: Gamemode;

    public static async init(): Promise<boolean> {
        this.event = new EventEmitter();

        console.warn('[SocketAPI] Initializing...');
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
            if (event.eventType === 'Delete' || data.selectedChampionId === 0) {
                this.event.emit('onChampClear');
                return;
            }

            this.event.emit('onChampSelected', {
                name: data.championName.toLowerCase().replace(/\s/g, '').replace("'", '').replace('.', '').replace('`', ''),
                originalName: data.championName,

                avatarPic: `https://cdn.communitydragon.org/latest/champion/${data.selectedChampionId}/square.png`,
                championId: data.selectedChampionId,
            } as Champion);
        });

        this.ws.subscribe('/lol-champ-select/v1/session', (data, event: any) => {
            const current = CredentialsAPI.getUser();
            if (event.eventType !== 'Update' && data.timer.phase !== '') return;

            const player = data.myTeam.find((member) => member.summonerId === current.summonerId);
            if (!player) return;

            let role: Role = null;
            let gameRole = player.assignedPosition;
            if (gameRole) {
                if (gameRole === 'utility') gameRole = 'support';
                role = gameRole;
            }

            this.event.emit('onPlayerRoleUpdate', role);
        });

        this.ws.subscribe('/lol-champ-select/v1/session', (data) => {
            if (this.prevPhase === data.timer.phase) return;

            this.prevPhase = data.timer.phase;
            this.event.emit('onLobbyPhaseChange', this.prevPhase);
        });

        this.ws.subscribe('/lol-gameflow/v1/session', (data, event: any) => {
            if (event.eventType !== 'Update') return;

            let gamemode = data.map.gameMode.toLowerCase();
            if (!isSupportedGamemode(gamemode)) gamemode = 'classic';
            if (this.prevGamemode === gamemode) return;

            this.prevGamemode = gamemode;
            this.event.emit('onGamemodeUpdate', gamemode as Gamemode);
        });

        /*this.ws.on('message', (stream) => {
            console.log(stream);
        });*/
    }
}
