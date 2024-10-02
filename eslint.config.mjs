import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  {
    languageOptions: {
      globals: globals.node, // Solo incluye las globales de Node.js
    },
  },
  pluginJs.configs.recommended,
];
