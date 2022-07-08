import { CredentialsAPI } from './src/api/credentials';
import { App } from './src/app';

import './src/extensions/math';

require('events').EventEmitter.defaultMaxListeners = 100;

process.on('unhandledRejection', (reason: any) => {
    console.log(`ERROR: ${reason}`);
});

process.on('SIGTERM', () => {
    CredentialsAPI.shutdown();
});

App.init(); // Start the program
