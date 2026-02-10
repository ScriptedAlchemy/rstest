# react-webpack-MF

[English](./README.md)

一个相对完整的应用`Webpack Module Federation`的 React 项目案例

# 目录结构

## lib-app

该示例已简化，不再包含 `lib-app`。

## component-app

组件层 App，通过 Module Federation 暴露组件给 `main-app` 使用。

它是一个纯粹的 `remote`。

## main-app

上层 App，依赖 `component-app` 应用。它也是一个纯粹的 `host`。

## browser-mode-mf

一个用于 **Rstest browser mode** 的最小 Module Federation 示例。

它使用 `@module-federation/enhanced`，并在浏览器中通过 HTTP 加载 remotes。

# 如何使用

- `pnpm install`
- `pnpm run start`

执行完上述命令，打开浏览器，输入 `http://localhost:3002` 查看页面结果。

## browser mode federation 测试示例

运行：

- `pnpm run test:browser`

该命令会执行 `browser-mode-mf/rstest.config.ts`，演示在 browser mode 下使用 federation（不依赖 Node/CommonJS 兼容路径）。

[最佳实践、规则和更多信息请参阅](../../playwright-e2e/README.md)
