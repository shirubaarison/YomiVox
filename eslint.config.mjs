import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["src/reader/**/*.ts"],
    rules: {
      // Firefox classic content scripts share these namespaces across files.
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { varsIgnorePattern: "^YomiVoxReader$" },
      ],
    },
  },
  prettier,
);
