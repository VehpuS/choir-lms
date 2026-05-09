import nx from '@nx/eslint-plugin';

const LINTABLE_SOURCE_FILES = [
    '**/*.ts',
    '**/*.tsx',
    '**/*.cts',
    '**/*.mts',
    '**/*.js',
    '**/*.jsx',
    '**/*.cjs',
    '**/*.mjs',
];

export default [
    ...nx.configs['flat/base'],
    ...nx.configs['flat/typescript'],
    ...nx.configs['flat/javascript'],
    {
        ignores: ['**/dist', '**/out-tsc', '**/.expo', '**/coverage'],
    },
    {
        files: LINTABLE_SOURCE_FILES,
        rules: {
            '@nx/enforce-module-boundaries': [
                'error',
                {
                    enforceBuildableLibDependency: true,
                    allow: ['^.*/eslint\\.config\\.[cm]?[jt]s$'],
                    depConstraints: [{ sourceTag: '*', onlyDependOnLibsWithTags: ['*'] }],
                },
            ],
            'max-lines': [
                'warn',
                {
                    max: 300,
                    skipBlankLines: true,
                    skipComments: true,
                },
            ],
        },
    },
];