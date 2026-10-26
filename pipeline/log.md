# Pipeline Log

調整請求依 PLAYBOOK 附錄 B 的格式追加在本檔最後。

## MCP 問題

### 2026-10-26 Phase 2.3 blender MCP 連不上
- 現象：Claude Code 啟動 `uvx blender-mcp` 逾時（CONNECT_TIMEOUT 30s），沒有 mcp__blender__* 工具
- 原因：localhost:9876 被 Blender 5.2 內建的 Blender Lab「MCP」擴充（lab_blender_org/mcp v1.0.3）佔用，不是 blender/addon.py。
  兩者協定不同（Lab 版用 \0 結尾、不認得 get_scene_info），blender-mcp server 啟動時的握手每次等 ~40s 才失敗，超過 30s 上限
- 附帶：check_env.mjs 只測 TCP，所以誤判 OK
- 附帶：blender-mcp（現為 mcp-for-blender shim）預設會送 telemetry，可用環境變數 DISABLE_TELEMETRY=true 關閉
- 替代做法：無（需人工在 Blender 處理）→ STOP
- 解決：使用者依步驟重裝 blender MCP 後重跑 Phase 2 驗證全部通過（addon mcp-for-blender 1.8、protocol 15、telemetry_consent=false）

### 2026-10-26 blender MCP 沒有 get_viewport_screenshot 工具
- 現象：PLAYBOOK 3.2 指定的 `get_viewport_screenshot` 在目前 MCP（mcp-for-blender）不存在
- 替代做法：改用 `mcp__blender__look`（viewport / angles 模式）做截圖自檢

### 2026-10-26 Phase 3.6 godot MCP add_node 無法 instance .glb
- 現象：`add_node` 只走 `ClassDB.instantiate()` 或 script class，不支援 PackedScene；properties 用 `Node.set()` 塞 JSON 值，Resource / Vector3 類型設不進去
- 替代做法：`create_scene` 建空場景後，直接編輯 .tscn 加 `ext_resource`（PackedScene，用 .glb.import 的 uid）與 `instance=ExtResource(...)` 節點

---

## 2026-10-26 10:35 crate iter 1
- check: PASS（1.00 × 1.00 × 1.00 m、156 tris、has_collision=true）
- 判斷: —
- 對 Blender 的請求: —（第一次就通過）
- 結果: PASS

## 2026-10-26 10:37 player iter 1
- check: FAIL — FIX player: Blender 尺寸正確但 Godot 量到 1.00m × 1.80m × 1.00m → 檢查 transform_apply 與 glTF 匯出軸向（+Y Up）
- 判斷: pipeline 問題。crate collection 在 viewport 被我隱藏，crate-col 還保留上次 export 的選取狀態；附錄 A 的 `select_all(DESELECT)` 不處理隱藏物件，`use_selection=True` 就把 crate-col 一起匯出（export log 有 `Extracting primitive: crate`，check 也多出 has_collision=true）
- 對 Blender 的請求: 匯出前先把所有 asset collection 設回可見，並對所有物件 `select_set(False)`，再跑標準 snippet（snippet 本身不改）
- 結果: FAIL（iter 1）

## 2026-10-26 10:37 player iter 2
- check: PASS（0.60 × 1.80 × 0.60 m、800 tris、has_collision=false；同時重驗 crate PASS）
- 判斷: —
- 對 Blender 的請求: —（iter 1 的 pipeline 修正生效；之後每次 export 前都先做「所有 collection 可見 + 全部取消選取」）
- 結果: PASS

## 2026-10-26 10:38 coin iter 1
- check: PASS（0.50 × 0.50 × 0.08 m、252 tris）
- 判斷: —
- 對 Blender 的請求: —（第一次就通過）
- 結果: PASS

## 2026-10-26 10:38 goal_flag iter 1
- check: PASS（0.80 × 2.00 × 0.10 m、220 tris；旗桿放 x=-0.35 讓 bbox X 置中）
- 判斷: —
- 對 Blender 的請求: —（第一次就通過）
- 結果: PASS
