# AGENT 约束与检查清单

## Push 前检查
- 若修改了 `mobile/package.json`，必须先在 `mobile` 目录执行 `npm install`，确保 `mobile/package-lock.json` 同步更新并提交。
- 确认不存在未提交的 lockfile 变更，避免 `npm ci` 失败。
