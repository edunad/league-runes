export interface Item {
    id: string;
    count: number;
}

export interface ItemBlock {
    hideIfSummonerSpell: string;
    items: Item[];
    showIfSummonerSpell: string;
    type: string;
}

export interface ItemSet {
    title: string;

    associatedMaps: number[];
    associatedChampions: number[];

    blocks: ItemBlock[];

    startedFrom: 'blank';
    sortrank: 0;

    mode: 'any'; // @deprecated
    map: 'any'; // @deprecated
    type: 'custom'; // @deprecated

    preferredItemSlots: [];

    uid?: string; // Filled by api
}

export interface ItemBuild {
    accountId: number;
    itemSets: ItemSet[];
    timestamp: number;
}
