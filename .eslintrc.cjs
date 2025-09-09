/* eslint-env node */
module.exports = {
  root: true,
  extends: ["next", "turbo", "prettier"],
  parserOptions: { tsconfigRootDir: __dirname, project: ["./tsconfig.base.json"] },
  rules: {
    "@next/next/no-html-link-for-pages": "off",
    "react/jsx-key": "warn"
  },
  settings: {
    next: { rootDir: ["apps/*/"] }
  }
};

