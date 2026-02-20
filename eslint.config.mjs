// eslint.config.mjs — Flat Config（TS/React/Next）
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  {
    ignores: [
      ".next/**",
      ".vercel/**",
      "node_modules/**",
      "public/**",

      // バックアップ・スナップショット・レガシー
      "backup/**",
      ".musiam/**",
      "musiam-front-2025-09-26/**",
      "src/**/**.backup.*",
      "src/**/**.bak.*",
      "src/**/**.2025*/**",
      "src/app/oracle/omikuji._bak/**",
      "src/pages_legacy/**",

      // ツール設定ファイル（Node CJS）
      "commitlint.config.cjs",

      // 設定ファイルなど
      "postcss.config.js",
      "next-env.d.ts",

      // まずは scripts を除外（後で別プロファイルで lint 可能）
      "scripts/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
      "@next/next": nextPlugin,
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...nextPlugin.configs["core-web-vitals"].rules,
      "react/react-in-jsx-scope": "off",
      ...reactHooks.configs.recommended.rules,

      // まずは“開発を止めない”ために緩める
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
      "@typescript-eslint/ban-ts-comment": "off",
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        process: "readonly",
        module: "readonly",
      },
    },
  },
];
