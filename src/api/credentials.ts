import { authenticate, Credentials } from 'league-connect';

export class CredentialsAPI {
    private static apiCred: Credentials;
    public static async init(): Promise<void> {
        return authenticate({ awaitConnection: true })
            .then((cred) => {
                this.apiCred = cred;
            })
            .catch((err) => console.warn(`[CredentialsAPI] ${err}`));
    }

    public static getUserId(): number {
        return this.apiCred.pid;
    }

    public static getToken(): Credentials {
        return this.apiCred;
    }
}
