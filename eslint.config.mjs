import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		ignores: ["dist/", "node_modules/", "drizzle/meta/"],
	},
	js.configs.recommended,
	...tseslint.configs.recommendedTypeChecked.map((config) => ({
		...config,
		files: ["**/*.{ts,tsx}"],
	})),
	prettier,
	{
		files: ["src/**/*.{ts,tsx}", "*.config.ts", "vitest.*.ts"],
		languageOptions: {
			parserOptions: {
				project: [
					"./tsconfig.json",
					"./tsconfig.web.json",
					"./tsconfig.eslint.json",
				],
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			"@typescript-eslint/no-unnecessary-type-assertion": "error",
			"@typescript-eslint/no-require-imports": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/restrict-template-expressions": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
				},
			],
			"no-constant-binary-expression": "off",
		},
	},
);
