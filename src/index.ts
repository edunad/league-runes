import { createWebSocketConnection } from 'league-connect';

import './extensions/math';

import {MetaSRC} from './plugins/metasrc';

// https://lcu.vivide.re/#operation--lol-collections-v1-inventories--summonerId--runes-get
const main = async () => {
    const ws = await createWebSocketConnection({
        authenticationOptions: {
            awaitConnection: true,
        },
        pollInterval: 3000
    });

    /*{
        championName: 'Elise',
        isSkinGrantedFromBoost: false,
        selectedChampionId: 60,
        selectedSkinId: 60002,
        showSkinSelector: true,
        skinSelectionDisabled: false
    }*/

    ws.subscribe('/lol-champ-select/v1/skin-selector-info', (data, event: any) => {
        if(event.eventType !== 'Create') return;
        console.warn("/lol-champ-select/v1/skin-selector-info", data, event);
    });

    ws.subscribe('/lol-gameflow/v1/session', (data, event: any) => {
        if(event.eventType !== 'Update' && data.phase === 'ChampSelect') return;
        console.warn(data.map.gameMode);
    });

    const test = await MetaSRC.getChampion('jinx');

    /*ws.subscribe('/lol-lobby/v2/lobby', (data, event: any) => {
        //if(event.eventType !== 'Update') return;
        console.warn("/lol-lobby/v2/lobby", data, event);
    });*/

    /*ws.subscribe('/lol-chat/v1/me', (data, event: any) => {
        if(event.eventType !== 'Update') return;
        console.warn("/lol-chat/v1/me", data, event);
    });*/


    /*ws.on('message', (message) => {
        console.warn(message);
    });*/
}

main()