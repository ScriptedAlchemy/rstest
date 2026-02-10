# react-webpack-MF

[中文](./README_zh-cn.md)

A complete Webpack Module Federation Case with React.

# project directory

## lib-app

Removed in this simplified example.

## component-app

It exposes UI components to `main-app` via Module Federation.

It is a pure `remote`.

## main-app

The top-level app, which depends on `component-app`.

It is a pure host.

## browser-mode-mf

A minimal Module Federation example for **Rstest browser mode**.

It uses `@module-federation/enhanced` and loads remotes over HTTP in the browser.

# how to use

- `pnpm install`
- `pnpm run start`

After running these commands, open your browser at `http://localhost:3002` and open the DevTools network tab to see resource loading details.

## browser mode federation test example

Run:

- `pnpm run test:browser`

This executes `browser-mode-mf/rstest.config.ts`, which demonstrates browser-mode federation without the Node/CommonJS federation compatibility path.

[Best practices, rules and more interesting information here](../../playwright-e2e/README.md)
