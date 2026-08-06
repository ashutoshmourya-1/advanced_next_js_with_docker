import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReactHooks from "eslint-plugin-react-hooks";
import unusedImports from "eslint-plugin-unused-imports";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import css from "@eslint/css";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintReact from "@eslint-react/eslint-plugin";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  tseslint.configs.recommended,
  {
    ...pluginReactHooks.configs.flat["recommended-latest"],
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
  },
  {
    ...eslintReact.configs["recommended-type-checked"],
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
  },
  {
    files: ["**/*.{ts,mts,cts,tsx}"],
    plugins: {
      "unused-imports": unusedImports,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      "@typescript-eslint/naming-convention": [
        "error",

        {
          selector: "variable",
          modifiers: ["destructured"],
          format: null,
        },
        {
          selector: [
            "classProperty",
            "objectLiteralProperty",
            "typeProperty",
            "classMethod",
            "objectLiteralMethod",
            "typeMethod",
            "accessor",
            "enumMember",
          ],
          modifiers: ["requiresQuotes"],
          format: null,
        },
        {
          selector: "default",
          format: ["snake_case"],
          leadingUnderscore: "allow",
          trailingUnderscore: "forbid",
        },
        {
          selector: ["variable", "function"],
          filter: {
            regex: "^(use|set)",
            match: true,
          },
          format: ["camelCase", "snake_case"],
        },
        {
          selector: "variable",
          format: ["snake_case", "PascalCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },
        {
          selector: "variable",
          filter: {
            regex: "Ref$",
            match: true,
          },
          format: ["camelCase"],
        },

        {
          selector: "function",
          format: ["snake_case", "PascalCase"],
        },

        {
          selector: "parameter",
          format: ["snake_case", "camelCase"],
          leadingUnderscore: "allow",
        },

        {
          selector: ["classProperty", "classMethod"],
          format: ["snake_case"],
          leadingUnderscore: "allow",
        },

        {
          selector: ["class", "typeLike"],
          format: ["PascalCase"],
        },

        {
          selector: ["objectLiteralProperty", "objectLiteralMethod"],
          format: ["snake_case", "camelCase"],
          leadingUnderscore: "allow",
        },

        {
          selector: ["typeProperty", "typeMethod"],
          format: ["snake_case", "camelCase"],
          leadingUnderscore: "allow",
        },
        {
          selector: "enumMember",
          format: ["UPPER_CASE"],
        },

        {
          selector: "import",
          format: ["camelCase", "PascalCase", "snake_case", "UPPER_CASE"],
        },
      ],
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",

      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          args: "after-used",
          ignoreRestSiblings: true,
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
          allowConciseArrowFunctionExpressionsStartingWithVoid: true,
        },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/explicit-member-accessibility": [
        "error",
        {
          accessibility: "explicit",
          overrides: {
            constructors: "no-public",
            accessors: "explicit",
          },
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/consistent-type-exports": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/prefer-optional-chain": "warn",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: { attributes: false },
        },
      ],
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",

      "no-shadow": "off",
      "@typescript-eslint/no-shadow": "error",
      "prefer-const": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-duplicate-imports": "error",
      curly: ["error", "all"],
      "no-unneeded-ternary": "error",
      "prefer-template": "error",
      "object-shorthand": ["error", "always"],
      "no-param-reassign": ["error", { props: true }],
      "no-return-await": "error",
      "no-else-return": ["error", { allowElseIf: false }],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  },

  {
    files: [
      "*.config.{js,ts,mjs,cjs}",
      "next.config.*",
      "tailwind.config.*",
      "postcss.config.*",
      "prettier.config.*",
    ],
    rules: {
      "@typescript-eslint/naming-convention": "off",
    },
  },

  {
    files: [
      "**/*.{test,spec}.{ts,tsx}",
      "**/__tests__/**/*.{ts,tsx}",
      "**/test/**/*.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "no-console": "off",
    },
  },

  {
    files: ["**/*.md"],
    plugins: { markdown },
    language: "markdown/gfm",
    extends: ["markdown/recommended"],
  },

  {
    files: ["**/*.css"],
    plugins: { css },
    language: "css/css",
    extends: ["css/recommended"],
    languageOptions: {
      tolerant: true,
    },
    rules: {
      "css/no-invalid-at-rules": "off",
      "css/use-baseline": "off",
      "css/no-important": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "eslint.config.mts",
    "next-env.d.ts",
    "package.json",
    "postcss.config.mjs",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "next.config.ts",
    "next-env.d.ts",
    ".env.*",
    "README.md",
    "node_modules/**",
  ]),
]);
