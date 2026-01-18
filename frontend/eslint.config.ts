import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["**/dist/**", "src/router-types/**"],
  },

  {
    files: ["**/*.{ts,mts,cts}"],
  },

  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,mts,cts}"],
    languageOptions: {
      globals: globals.node,
    },
  },
];

