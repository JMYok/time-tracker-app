# BUG 记录

## 2026-02-09 - Token 验证失败
- 现象：进入页面后提示验证失败，即使从 Neon 复制 token 也无法通过。
- 根因：网络问题（国内需挂 VPN 才能请求到接口）。
- 处理建议：检查网络/代理/VPN 状态后再进行验证。

## 2026-02-09 - Android 构建 npm ci 失败
- 现象：Android 构建报错，提示 package.json 与 package-lock.json 不一致。
- 根因：新增依赖后未更新 lockfile（例如缺少 @react-native-community/datetimepicker@8.4.1）。
- 处理建议：在 mobile 目录运行 `npm install` 更新 lockfile，并一同提交。
