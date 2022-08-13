import { authenticate, createHttp1Request, Credentials } from 'league-connect';

export interface User {
    accountId: number;
    summonerId: number;
}

export class CredentialsAPI {
    private static apiCred: Credentials;
    private static session: any;
    private static account: User;

    public static async init(): Promise<boolean> {
        return (
            authenticate({ awaitConnection: true })
                .then((cred) => {
                    this.apiCred = cred;
                })
                .then(() => {
                    return this.getAccount();
                })
                /*.then((cred) => {
                return createHttpSession(cred)
                    .then((session) => {
                        if (session == null) throw new Error('[CredentialsAPI] Failed to create session');
                        console.warn(session);
                        this.session = session;
                    })
                    .catch((err) => console.warn(`[CredentialsAPI] ${err}`));
            })*/
                .catch((err) => {
                    console.warn(`[CredentialsAPI] ${err}`);
                    return false;
                })
        );
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
