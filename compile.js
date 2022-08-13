const { compile } = require('nexe');
const packg = require('./package.json');

const fs = require('fs-extra');
const signtool = require('signtool');
const archiver = require('archiver');

require('dotenv-flow').config();

/// Cleanup -----
fs.removeSync('.bin'); // cleanup
//// -----

//// Setup ----
const output = fs.createWriteStream('./rune.zip');
const archive = archiver('zip', {
    zlib: { level: 9 }, // Sets the compression level.
});
/////

compile({
    input: './.output/index.js',
    output: './.bin/Rune.exe',
    build: true,

    ico: './icon.ico',
    title: 'Rune',

    rc: {
        CompanyName: 'FailCake',
        PRODUCTVERSION: packg.version,
        FILEVERSION: packg.version,
    },
}).then(() => {
    fs.removeSync('.output'); // Remove compiled files

    signtool.sign('.bin/Rune.exe', { certificate: '.cert/cake_cert.pfx', password: `${process.env.CERT_PASSWORD}` }).then((result) => {
        if (result.code !== 0) throw new Error(`Failed to sign Rune.exe: ${result.code}`);

        archive.pipe(output);
        archive.directory('./.bin', false);
        archive.finalize().then(() => {
            console.warn('DONE!!');
        });
    });
});
