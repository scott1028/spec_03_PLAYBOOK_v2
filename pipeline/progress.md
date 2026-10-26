# Progress

標記：`[v]` 完成且通過、`[x]` 做了但沒通過、`[ ]` 還沒做。步驟定義見 .spec/PLAYBOOK.md。

## Phase 0：環境檢查
- [v] 0.1 node / uv / git 版本
- [v] 0.2 找 Godot 執行檔
- [v] 0.3 Godot 版本 ≥ 4.3
- [v] 0.4 缺項檢查（無缺項）

## Phase 1：專案骨架
- [v] 1.1 pipeline.config.json
- [v] 1.2 assets.json
- [v] 1.3 .mcp.json
- [v] 1.4 .claude/settings.json（Claude 被權限擋下，由使用者手動建立）
- [v] 1.5 .gitignore
- [v] 1.6 game/project.godot
- [v] 1.7 game/tools/inspect_assets.gd
- [v] 1.8 Node 工具（check_env / import / check_assets / bot_test）
- [v] 1.9 下載 Blender addon
- [v] 1.10 CLAUDE.md
- [v] 1.11.1 建立 progress.md、log.md
- [v] 1.11.2 git init
- [v] 1.11.3 node tools/import.mjs
- [v] 1.11.4 git commit

## Phase 2：連線 MCP（人工）
- [v] 2.人工 安裝 addon、啟動 server、重啟 Claude Code（使用者重裝 blender MCP；addon 為 mcp-for-blender 1.8）
- [v] 2.1 node tools/check_env.mjs 全部 OK（重裝後重跑通過）
- [v] 2.2 mcp__godot__get_godot_version（4.7.2.stable）
- [v] 2.3 mcp__blender__get_scene_info（重裝後成功；Blender 5.2.2 LTS）
- [v] 2.4 失敗檢查（無失敗）

## Phase 3：單一資產冒煙測試（crate）
- [ ] 3.1 Blender 建模 crate
- [ ] 3.2 截圖自檢
- [ ] 3.3 標準 export
- [ ] 3.4 node tools/import.mjs
- [ ] 3.5 node tools/check_assets.mjs crate PASS
- [ ] 3.6 建立 test_crate.tscn 並 instance crate.glb
- [ ] 3.7 run_project / get_debug_output / stop_project
- [ ] 3.8 git commit

## Phase 4：其餘資產
- [ ] 4.1 player（步驟 1–5）
- [ ] 4.1 coin（步驟 1–5）
- [ ] 4.1 goal_flag（步驟 1–5）
- [ ] 4.2 node tools/check_assets.mjs 全部 PASS
- [ ] 4.3 git commit

## Phase 5：Godot 遊戲實作
- [ ] 5.1 建立 main.tscn
- [ ] 5.2 撰寫腳本
- [ ] 5.3 node tools/import.mjs
- [ ] 5.4 node tools/bot_test.mjs PASS
- [ ] 5.5 run_project / get_debug_output / stop_project
- [ ] 5.6 檢查 pipeline/screenshot.png
- [ ] 5.7 git commit

## Phase 6：迴圈演練
- [ ] 6.1 log 寫下 Godot 回饋
- [ ] 6.2 修改 assets.json coin.size_m
- [ ] 6.3 check_assets coin 應 FAIL
- [ ] 6.4 Blender 調整 → export → import → check PASS
- [ ] 6.5 Coin SphereShape3D 半徑 0.3，bot_test 仍 PASS
- [ ] 6.6 run_project 確認截圖，git commit

## Phase 7：收尾
- [ ] 7.1 撰寫 pipeline/REPORT.md
- [ ] 7.2 git commit
- [ ] 7.3 回報 PoC 完成
