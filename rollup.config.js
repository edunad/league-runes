// rollup.config.js

import { join } from 'path';

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

        typescript({
            tsconfig: join(__dirname, `tsconfig.json`),
        }),

        commonjs(),
        nodeResolve({ exportsConditions: ['node'], preferBuiltins: true, custom: { 'node-resolve': { isRequire: true } } }),

        json(),

        // Because chalk is retarted and won't do a proper "browser" check
        copy({
            targets: [{ src: './.patches/chalk/browser.js', dest: './node_modules/chalk/source/vendor/supports-color' }],
            verbose: true,
            hook: 'buildStart',
        }),
    ],
};
