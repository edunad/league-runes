// rollup.config.js
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';

import typescript from '@rollup/plugin-typescript';
import del from 'rollup-plugin-delete';

export default {
    input: './index.ts',
    output: {
        format: 'cjs',
        dir: './.bin',

        name: 'RUNES',
        preserveModules: true,
        sourcemap: true,
        exports: 'named',
    },
    plugins: [
        del({ targets: ['.bin/'] }),
        typescript(),
        //commonjs(),

        nodeResolve({ exportsConditions: ['node'], preferBuiltins: true, custom: { 'node-resolve': { isRequire: true } } }),

        json(),
    ],
};
