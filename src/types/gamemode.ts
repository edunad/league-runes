export type Gamemode = 'classic' | 'twisted-treeline' | 'aram' | 'urf';

export const isSupportedGamemode = (keyInput: string): keyInput is Gamemode => {
    return ['classic', 'twisted-treeline', 'aram', 'urf'].includes(keyInput);
};
