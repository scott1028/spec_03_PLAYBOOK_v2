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
- [v] 3.1 Blender 建模 crate（單一 mesh `crate-col`：0.92 箱體 + 12 根 0.08 框條，2 個材質）
- [v] 3.2 截圖自檢（用 `look` 取代 get_viewport_screenshot；框條調深一次）
- [v] 3.3 標準 export
- [v] 3.4 node tools/import.mjs（main.tscn 不存在的 ERROR 屬預期，Phase 5 才建）
- [v] 3.5 node tools/check_assets.mjs crate PASS（iter 1）
- [v] 3.6 建立 test_crate.tscn 並 instance crate.glb（add_node 不能 instance，直接編輯 .tscn；見 log）
- [v] 3.7 run_project / get_debug_output / stop_project（run_project 支援 scene 參數，無錯誤）
- [v] 3.8 git commit

## Phase 4：其餘資產
- [v] 4.1 player（步驟 1–5；iter 2 PASS，iter 1 為 pipeline 問題：隱藏 collection 的物件被一起匯出，見 log）
- [v] 4.1 coin（步驟 1–5；iter 1 PASS）
- [v] 4.1 goal_flag（步驟 1–5；iter 1 PASS）
- [v] 4.2 node tools/check_assets.mjs 全部 PASS（4 pass, 0 fail）
- [v] 4.3 git commit

## Phase 5：Godot 遊戲實作
- [v] 5.1 建立 main.tscn（MCP 建骨架，transform/shape/script/glb instance 直接編輯 .tscn；見 log）
- [v] 5.2 撰寫腳本（main / player / coin / goal）
- [v] 5.3 node tools/import.mjs（0 ERROR/WARNING，無 UID 警告）
- [v] 5.4 node tools/bot_test.mjs PASS（第一次就通過）
- [v] 5.5 run_project / get_debug_output / stop_project（errors 為空）
- [v] 5.6 檢查 pipeline/screenshot.png（四種資產可見、比例合理、無倒立/躺平）
- [v] 5.7 git commit

## Phase 6：迴圈演練
- [v] 6.1 log 寫下 Godot 回饋
- [v] 6.2 修改 assets.json coin.size_m（[0.3, 0.3, 0.06]）
- [v] 6.3 check_assets coin 應 FAIL（如預期 FAIL，FIX 建議縮放 X/Z 0.6、Y 0.75）
- [v] 6.4 Blender 調整 → export → import → check PASS（iter 2）
- [v] 6.5 Coin SphereShape3D 半徑 0.3，bot_test 仍 PASS
- [v] 6.6 run_project 確認截圖，git commit

## Phase 7：收尾
- [v] 7.1 撰寫 pipeline/REPORT.md
- [v] 7.2 git commit
- [v] 7.3 回報 PoC 完成

## Phase 8：箱庭世界 + 物理（PLAYBOOK 延伸）
- [v] 8.1 assets.json：player 改單輪機器人，新增 tree / bush / rock / wall_brick / house / mage_tower / temple_ruins / barrel
- [v] 8.2 player（機器人 + wheel_spin 動畫）建模 → export → import → check PASS（iter 1）
- [v] 8.3 tree / bush / rock / barrel 建模 → check PASS（皆 iter 1）
- [v] 8.4 wall_brick / house / mage_tower / temple_ruins 建模 → check PASS（皆 iter 1）
- [v] 8.5 node tools/check_assets.mjs 全部 PASS（12 pass, 0 fail）
- [v] 8.6 物理腳本與互動道具場景（player 力模型、sway / tree / bush、barrel）+ physics_test
- [v] 8.7 tools/build_world.mjs 產生 world.tscn（106 個物件）；main.tscn 改 40×40、座標 ×2；等角跟隨鏡頭
- [v] 8.8 import → bot_test PASS → physics_test PASS
- [v] 8.9 run_project / get_debug_output / 跟隨截圖 + 全景截圖檢查（errors 為空）
- [v] 8.10 log / REPORT 更新，git commit

## Phase 9：木箱重做、加速 / 煞車、氣氛（PLAYBOOK 延伸）
- [v] 9.1 assets.json：crate 改 0.8 m 中世紀木板箱，新增 cloud
- [v] 9.2 crate / cloud 建模 → export → import → check PASS（crate iter 2、cloud iter 1）
- [v] 9.3 加速 / 煞車：input map（boost / brake）、player 力模型、physics_test、CLAUDE.md
- [v] 9.4 氣氛：雲漂移 + 雲影、暖色陽光 + 柔影 + SSAO、微風擺動、移軸景深；木箱改擺放
- [v] 9.5 check_assets 全部 PASS（13 pass）、bot_test / physics_test PASS、run_project + 截圖檢查
- [v] 9.6 log / REPORT 更新，git commit
