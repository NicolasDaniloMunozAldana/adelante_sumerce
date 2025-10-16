import js from "@eslint/js";
import globals from "globals";
import jest from "eslint-plugin-jest";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,cjs}"],
    ignores: ["node_modules", "dist", "coverage", "eslint.config.mjs"],
    plugins: { js },
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
      sourceType: "commonjs",
    },
    rules: {
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    },
  },
  {
    files: ["**/*.test.js", "test/**/*.js"],
    plugins: { jest },
    languageOptions: {
      globals: globals.jest,
    },
    rules: {
      ...jest.configs.recommended.rules,
    },
  },
]);
