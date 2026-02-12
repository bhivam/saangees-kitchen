import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["**/dist/**", "**/*.js"],
  },

  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,mts,cts}"],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];

