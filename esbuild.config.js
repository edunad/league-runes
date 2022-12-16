import { build } from 'esbuild';
import { copy } from 'esbuild-plugin-copy';

build({
    entryPoints: ['./index.ts'],
    outfile: './output/index.js',
    bundle: true,
    minify: true,
    sourcemap: false,
    watch: false,
    plugins: [
        copy({
            resolveFrom: 'cwd',
            assets: [
                {
                    from: ['./.patches/chalk/browser.js'],
                    to: ['./node_modules/chalk/source/vendor/supports-color'],
                },
            ],
        }),
    ],
});
