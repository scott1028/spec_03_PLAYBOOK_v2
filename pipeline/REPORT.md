# Coin Run PoC 報告

這份報告整理 Blender MCP × Godot MCP pipeline 跑完一輪的結果：DoD 有沒有達成、每個資產改了幾次、MCP 哪裡卡住、下一步怎麼改。細節紀錄在 `pipeline/log.md`，步驟清單在 `pipeline/progress.md`。

## DoD 有沒有達成

五項都達成。最後一次驗證跑的是 `node tools/check_assets.mjs`（4 pass, 0 fail）和 `node tools/bot_test.mjs`（PASS）。

| 狀態 | 項目 | 證據 |
|---|---|---|
| [v] | 4 個資產 `check_assets` 全部 PASS | `SUMMARY: 4 pass, 0 fail` |
| [v] | Bot 輸出 `COIN 3/3`、`WIN`，沒有 `SCRIPT ERROR` | `BOT: PASS (COIN 3/3=true, WIN=true, error=false)` |
| [v] | `run_project` 後 `get_debug_output` 無錯誤，截圖已檢查 | `errors: []`；`pipeline/screenshot.png` 四種資產都看得到、沒有倒立或躺平 |
| [v] | 迴圈演練（規格變更 → FAIL → Blender 調整 → PASS） | coin 規格改 `[0.3, 0.3, 0.06]`，iter 1 FAIL、iter 2 PASS |
| [v] | `pipeline/REPORT.md` 已寫 | 本檔 |

## 每個資產改了幾次

「迭代」指一次 export → import → check。四個資產裡只有 player 和規格變更後的 coin 需要第二次。

| 資產 | 迭代次數 | 最終尺寸（Godot X × Y × Z） | 面數 / 上限 | 第一次沒過的原因 |
|---|---|---|---|---|
| crate | 1 | 1.00 × 1.00 × 1.00 m | 156 / 1000 | — |
| player | 2 | 0.60 × 1.80 × 0.60 m | 800 / 3000 | pipeline 問題：crate-col 被一起匯出 |
| coin | 1（原規格）+ 2（Phase 6 新規格） | 0.30 × 0.30 × 0.06 m | 252 / 500 | 規格變更，Phase 6 預期中的 FAIL |
| goal_flag | 1 | 0.80 × 2.00 × 0.10 m | 220 / 800 | — |

沒有任何資產碰到 `maxIterations`（3 次）上限。

## player 第一次為什麼沒過

這是這輪唯一一個「不是建模錯」的 FAIL，check 工具正確抓到了，下一個人很可能再踩到。

```text
做 coin 時隱藏 crate collection ──► crate-col 還留著上次 export 的選取狀態
        │
        ▼
附錄 A：select_all(DESELECT) ──► 只取消「可見」物件，crate-col 沒被取消
        │
        ▼
export_scene.gltf(use_selection=True) ──► player.glb 混進 crate-col
        │
        ▼
check_assets：Blender 尺寸 PASS、Godot 尺寸 1.00 × 1.80 × 1.00 FAIL ──► 印出 PIPELINE 提示
```

修法：每次跑標準 snippet 前，先把所有 asset collection 設回可見，再對 `view_layer.objects` 全部 `select_set(False)`。snippet 本身沒改。

## MCP 卡在哪、怎麼繞過

四個問題裡只有第一個需要人工處理，其他都改成直接編輯檔案或換工具。

| 工具 | 問題 | 替代做法 |
|---|---|---|
| blender MCP（Phase 2） | localhost:9876 被 Blender 5.2 內建的 Blender Lab「MCP」擴充佔用，協定不同，`uvx blender-mcp` 握手逾時 | 使用者重裝 blender MCP（mcp-for-blender 1.8，protocol 15）後重驗通過 |
| blender MCP `get_viewport_screenshot` | 目前的 MCP 沒有這個工具 | 改用 `mcp__blender__look`（angles 模式）自檢 |
| godot MCP `add_node` | 不能 instance PackedScene（.glb） | `create_scene` 建骨架後，直接在 .tscn 加 `ext_resource` 和 `instance=ExtResource(...)` |
| godot MCP `add_node` 的 `properties` | 用 `Node.set()` 塞 JSON 值，Vector3 / Transform3D / Resource 設不進去；只有 bool 這類純量能用 | transform、shape、mesh、environment、script 都直接編輯 main.tscn，保留 MCP 產生的 `unique_id` |

另外，godot MCP 每次 `add_node` 結束都印 `ERROR: N RID allocations ... leaked at exit`。原因是它的 headless 腳本沒 free 場景，不影響結果。

## 卡最久的步驟

以 commit 時間看，Phase 2 最久，Phase 5 其次。

```text
Time ─────────────────────────────────────────────────────────────►
10:22        10:34       10:36     10:38          10:43     10:44
  │ Phase 2   │ Phase 3   │ Phase 4 │ Phase 5       │ Phase 6 │
  │ 12 分鐘   │ 2 分鐘    │ 2 分鐘  │ 5 分鐘        │ 1 分鐘  │
  │ 需要人工  │           │         │ 20 次 MCP 呼叫│         │
```

- Phase 2：Blender 埠被別的擴充佔用，要人工重裝，跨了一次 Claude Code 重啟。
- Phase 5：`create_scene` + 18 次 `add_node` + `save_scene`，每次都啟動一次 headless Godot；做完後 transform、shape、glb instance 還是要手改 .tscn。

## 建議的下一步

依「省下最多人工 / 最常踩」排序：

1. **修附錄 A 的選取邏輯**：把 `select_all(DESELECT)` 換成對 `view_layer.objects` 全部 `select_set(False)`，從根本避免 player iter 1 的問題。
2. **`check_env.mjs` 改成真的握手**：現在只測 TCP，9876 被別的程式佔用也會印 OK。改成送一個 `get_scene_info` 請求並檢查回應格式。
3. **加 hook 自動 import + check**：用 Claude Code 的 PostToolUse hook，在 `execute_blender_code` 輸出含 `Finished glTF 2.0 export` 時自動跑 `node tools/import.mjs` 和 `node tools/check_assets.mjs <id>`，不用靠 agent 記得。
4. **Godot 場景改用 headless builder 腳本**：寫一支 `game/tools/build_main.gd`，用 `godot --headless -s` 一次建好整個 main.tscn（含 transform 和 Resource）。比 20 次 `add_node` 加手改快，也能重跑。
5. **把角色朝向納入 check**：`check_assets` 目前不驗「正面朝 +Z」，這輪只靠截圖確認。可以約定眼睛 mesh 命名，由 inspect 檢查它的 Z 是否為正。
6. **拆 sub-agent**：以 `assets.json` 當合約，一個 agent 負責 Blender 建模和 check 迴圈，另一個負責 Godot 場景和 bot test。Blender 只有一個 live 實例，建模本身不適合平行。
