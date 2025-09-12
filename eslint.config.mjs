// eslint.config.mjs（完全版）
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  { ignores: ["backup/**", "_archive/**", ".next/**", "node_modules/**", "dist/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  nextPlugin.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-require-imports": "error",
      "@next/next/no-img-element": "warn",
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
];
