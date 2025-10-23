// eslint.config.mjs — Flat Config（TS/React/Next：完全版）
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  // ❶ まずは除外
  {
    ignores: [
      ".next/**",
      ".vercel/**",          // ← 追加：Vercel output を丸ごと除外
      "node_modules/**",
      "public/**",
      "dist/**",             // ← 追加：ビルド生成物
      "coverage/**",
      "test-results/**",

      // バックアップ・スナップショット・レガシー
      "backup/**",
      ".musiam/**",
      "src/**/**.backup.*",
      "src/**/**.bak.*",
      "src/**/**.2025*/**",
      "src/app/oracle/omikuji._bak/**",
      "src/pages_legacy/**",

      // 設定ファイルなど（※ next-env.d.ts は型生成物）
      "postcss.config.js",
      "next-env.d.ts",

      // まずは scripts を除外（必要に応じて後で別プロファイルに）
      "scripts/**",
    ],
  },

  // ❷ ベース推奨
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // ❸ アプリ本体（React/Next）
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: { react, "react-hooks": reactHooks, "@next/next": nextPlugin },
    settings: { react: { version: "detect" } },
    rules: {
      ...nextPlugin.configs["core-web-vitals"].rules,
      "react/react-in-jsx-scope": "off",
      ...reactHooks.configs.recommended.rules,

      // “開発を止めない”緩和（必要に応じて後で締める）
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/ban-ts-comment": "off",
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        process: "readonly",
        module: "readonly",
        console: "readonly",
      },
    },
  },

  // ❹ Node向け設定ファイル（CJS/require を許容）
  {
    files: [
      "next.config.{js,cjs,mjs,ts}",
      "tailwind.config.{js,cjs,mjs,ts}",
      "commitlint.config.cjs",
      "**/*.config.{js,cjs,mjs,ts}",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script", // ← CJS グローバルを想定
      globals: {
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
        process: "readonly",
      },
    },
    rules: {
      "no-undef": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];
