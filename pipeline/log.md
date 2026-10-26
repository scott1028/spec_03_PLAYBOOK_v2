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

---
