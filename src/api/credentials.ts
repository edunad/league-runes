import { authenticate, createHttp1Request, createHttpSession, Credentials } from 'league-connect';

export interface User {
    accountId: number;
    summonerId: number;
}

export class CredentialsAPI {
    private static apiCred: Credentials;
    private static session: any;
    private static account: User;

    public static async init(): Promise<boolean> {
        console.warn('[CredentialsAPI] Initializing...');

        return authenticate({ awaitConnection: true })
            .then((cred) => {
                this.apiCred = cred;
                return createHttpSession(cred);
            })
            .then((session) => {
                this.session = session;
            })
            .then(() => {
                return this.getAccount();
            })
            .catch((err) => {
                console.warn(`[CredentialsAPI] ${err}`);
                return false;
            });
    }

    private static getAccount(): Promise<boolean> {
        return createHttp1Request(
            {
                method: 'GET',
                url: `/lol-summoner/v1/current-summoner/account-and-summoner-ids`,
            },
            this.getToken(),
        )
            .then((resp) => {
                if (!resp.ok) throw new Error(`[CredentialsAPI] Failed to get user`);
                return resp.json();
            })
            .then((data: any) => {
                this.account = {
                    accountId: data.accountId as number,
                    summonerId: data.summonerId as number,
                };

                return true;
            })
            .catch(() => false);
    }

    public static shutdown(): void {
        if (this.session == null) return;
        return this.session.close();
    }

    public static getUser(): User {
        return this.account;
    }

    public static getToken(): Credentials {
        return this.apiCred;
    }

    public static getSession(): any {
        return this.session;
    }
}
