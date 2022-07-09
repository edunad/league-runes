import { CredentialsAPI } from './src/api/credentials';
import { App } from './src/app';

import './src/extensions/math';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
require('events').EventEmitter.defaultMaxListeners = 100;

process.on('unhandledRejection', (reason: any) => {
    console.log(`ERROR: ${reason}`);
});

process.on('SIGTERM', () => {
    CredentialsAPI.shutdown();
});

App.init(); // Start the program
