import { exec } from 'pkg';
import fs from 'fs-extra';
import signtool from 'signtool';
import archiver from 'archiver';
import { config } from 'dotenv-flow';
config();

/// Cleanup -----
fs.removeSync('.bin'); // cleanup
//// -----

//// Setup ----
const output = fs.createWriteStream('./rune.zip');
const archive = archiver('zip', {
    zlib: { level: 9 }, // Sets the compression level.
});
/////

exec(['./.output/index.js', '--target', 'latest-win', '--output', './.bin/Rune.exe']).then(() => {
    /* BROKEN :(
    const exe = ResEdit.NtExecutable.from(fs.readFileSync('./.bin/Rune.exe'));
    const res = ResEdit.NtExecutableResource.from(exe);
    const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(__dirname, './icon.ico')));

    ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
        res.entries,
        1,
        1033,
        iconFile.icons.map((item) => item.data),
    );

    const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0];

    vi.setStringValues(
        { lang: 1033, codepage: 1200 },
        {
            ProductName: 'Rune',
            FileDescription: 'For League of Legends',
            CompanyName: 'FailCake',
            LegalCopyright: `Copyright FailCake. MIT license.`,
        },
    );

    vi.removeStringValue({ lang: 1033, codepage: 1200 }, 'OriginalFilename');
    vi.removeStringValue({ lang: 1033, codepage: 1200 }, 'InternalName');
    vi.outputToResourceEntries(res.entries);
    res.outputResource(exe);

    fs.writeFileSync('./.bin/Rune.exe', Buffer.from(exe.generate()));
    */

    fs.removeSync('.output'); // Remove compiled files
    signtool.sign('.bin/Rune.exe', { certificate: '.cert/FailCake.pfx', password: `${process.env.CERT_PASSWORD}` }).then((result) => {
        if (result.code !== 0) throw new Error(`Failed to sign Rune.exe: ${result.code}`);

        archive.pipe(output);
        archive.directory('./.bin', false);
        archive.finalize().then(() => {
            console.warn('DONE!!');
        });
    });
});
