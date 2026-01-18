import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["**/dist/**"],
  },

  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,mts,cts}"],
    languageOptions: {
      globals: globals.node,
    },
  },
];

