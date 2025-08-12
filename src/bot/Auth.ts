import path from 'path';
import fs from 'fs';
import { IAuthData } from "../util/data/Data";

export class AuthFile {

    /**
     * Creates auth data through reading the relog file
     * @param authKey The auth key to read; this can be the first 5 characters since it's what's used
     */
    static from(authKey: string): IAuthData {
        authKey = authKey.substring(0, 5);

        const file = path.join(process.cwd(), `ppjs-relog-authdata-${authKey}.json`);
        if(!fs.existsSync(file)) {
            throw new Error(`There is no relog file for '${authKey}'!`);
        }

        let data;
        try {
            data = JSON.parse(fs.readFileSync(file, 'utf-8'));
        } catch (err) {
            throw new Error(`Error parsing relog for '${authKey}': ${err}`);
        }

        if(!data.authId)
            throw new Error(`Relog file for '${authKey}' does not have an authId parameter!`);
        if(!data.authToken)
            throw new Error(`Relog file for '${authKey}' does not have an authToken parameter!`);
        if(!data.authKey || data.authKey.substring(0, 5) != authKey)
            throw new Error(`Relog file for '${authKey}' has a mismatched authKey parameter!`);

        return data as IAuthData;
    }

}