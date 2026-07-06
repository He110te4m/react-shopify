# Project Rules

## Git Commit Messages

- 本项目提交信息必须使用中文描述。
- Conventional Commit 的 `type` 和 `scope` 可以保留英文，例如 `feat(react-dawn): ...`。
- subject、body、footer 中的说明文本必须使用中文，除非是代码标识符、文件名、命令、API 名称、版本号或引用原文。
- 多行 commit message 必须保留原有信息量；重写或整理提交时不要丢失 body/footer。

## React Dawn Migration

- 迁移 section 时必须先对照原 Liquid 文件、原 section CSS asset、生成后的 React Liquid 产物，只看源码。
- Dawn section CSS 要迁移到对应 React section CSS 中维护；不要在 React 源码中用 `useLiquidCode` 或 raw Liquid 重新引入原 `assets/section-*.css`。
- Theme Block 的 CSS 只放 block 自身可复用样式；父 section 对 block 的布局、间距、对齐规则必须归父 section CSS 管理。
- 遇到视觉异常时先检查实际 DOM 层级、生成 CSS 是否加载、selector 是否覆盖生成 wrapper，再改代码。
