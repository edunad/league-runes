// rollup.config.js
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import copy from 'rollup-plugin-copy';

import typescript from '@rollup/plugin-typescript';
import del from 'rollup-plugin-delete';

export default {
    input: './index.ts',
    output: {
        format: 'cjs',
        dir: './.output',

        name: 'RUNES',

        preserveModules: true,
        sourcemap: true,

        exports: 'named',
    },
    plugins: [
        del({ targets: ['.output/'] }),
        typescript(),
        commonjs({
            dynamicRequireTargets: ['./node_modules/reblessed/lib/widgets/*.js', './node_modules/reblessed/lib/*.js'],
            dynamicRequireRoot: '/',
        }),

        nodeResolve({ exportsConditions: ['node'], preferBuiltins: true, custom: { 'node-resolve': { isRequire: true } } }),

        json(),

        copy({
            targets: [{ src: './.patches/chalk/browser.js', dest: './.output/node_modules/chalk/source/vendor/supports-color' }],
            hook: 'closeBundle',
            verbose: true,
        }),
    ],
};
