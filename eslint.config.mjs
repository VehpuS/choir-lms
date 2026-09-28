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
    {
        // Every mobile icon renders through AppIcon so the Phosphor glyph map
        // (and its icon-semantics tests) stays the single source of icons.
        files: ['packages/mobile-rehearsal-player/src/**/*.{ts,tsx}'],
        ignores: ['packages/mobile-rehearsal-player/src/app/components/app-icon/**'],
        rules: {
            '@typescript-eslint/no-restricted-imports': [
                'error',
                {
                    paths: [
                        {
                            name: '@expo/vector-icons',
                            message: 'Use AppIcon from src/app/components/app-icon (Phosphor).',
                        },
                    ],
                    patterns: [
                        {
                            group: ['phosphor-react-native', 'phosphor-react-native/*'],
                            message: 'Add the glyph to src/app/components/app-icon and render AppIcon.',
                        },
                    ],
                },
            ],
        },
    },
];