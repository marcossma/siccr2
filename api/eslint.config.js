const js = require("@eslint/js");
const globals = require("globals");
const prettier = require("eslint-config-prettier");

module.exports = [
    {
        ignores: ["node_modules/**", "**/vendor/**", "**/lib/**", "**/*.min.js"],
    },

    js.configs.recommended,

    {
        files: ["**/*.js"],
        ignores: ["public/**/*.js"],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: "commonjs",
            globals: { ...globals.node },
        },
        rules: {
            eqeqeq: ["error", "always"],
            "no-var": "error",
            "prefer-const": "warn",
            "no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_|^error$",
                },
            ],
            "no-implicit-globals": "error",
            "no-undef-init": "error",
            "no-shadow": "warn",
        },
    },

    {
        files: ["public/**/*.js"],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: "script",
            globals: {
                ...globals.browser,
                ...globals.worker,
                Chart: "readonly",
            },
        },
        rules: {
            eqeqeq: ["error", "always"],
            "no-var": "warn",
            "prefer-const": "warn",
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
            "no-undef-init": "error",
        },
    },

    {
        files: ["public/js/components/**/*.js"],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: "module",
            globals: {
                ...globals.browser,
            },
        },
    },

    prettier,
];
