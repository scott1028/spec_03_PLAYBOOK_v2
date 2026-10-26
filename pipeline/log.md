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

### 2026-10-26 Phase 5.1 main.tscn 只有節點骨架能用 MCP 建
- MCP 完成：`create_scene` + 18 次 `add_node`（所有內建節點、DirectionalLight3D 的 `shadow_enabled=true`）+ `save_scene`
- MCP 做不到：transform（Vector3/Transform3D 從 JSON 進來是 Array，`Node.set()` 設不進去）、shape / mesh / environment 等 Resource、script 掛載、glb instance
- 替代做法：直接編輯 main.tscn 補上述內容，保留 MCP 產生的 unique_id；root 由 `root` 改名為 `Main`
- 附帶：每次 add_node 結束都印 `ERROR: N RID allocations ... leaked at exit`，是 godot-mcp headless 腳本沒 free 場景造成，不影響結果

### 2026-10-26 Phase 8 world.tscn 用產生器建立
- 現象：箱庭有 106 個 glb / 場景 instance，`add_node` 不能 instance，也設不了 transform
- 替代做法：`tools/build_world.mjs` 用版面陣列產生 `game/scenes/world.tscn`（外牆自動排、泥土路、台座），並檢查有碰撞的物件離 bot 路線至少 1 m；main.tscn 只 instance 一個 World
- tree / bush / barrel 場景：`create_scene` + `add_node` 建骨架（CPUParticles3D 的 scalar 屬性可由 MCP 設定），mesh / curve / gradient / shape / script 直接編輯 .tscn

### 2026-10-26 Phase 9 add_node 會重新序列化整個場景
- 現象：用 `add_node` 在 main.tscn 加 Clouds 時，godot-mcp 載入後用 ResourceSaver 重存整個檔案：ext_resource 的 uid 被拿掉、instance 節點補上 `type` 和 `unique_id`
- 影響：內容正確，但 diff 會出現和這次改動無關的格式變化
- 替代做法：接受 Godot 的正規化格式；script、NodePath 等仍直接編輯 .tscn

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

## 2026-10-26 10:44 Phase 6 迴圈演練
- Godot 回饋：coin 太大、擋視線 → 規格改為 [0.3, 0.3, 0.06]

## 2026-10-26 10:44 coin iter 1（規格變更後）
- check: FAIL — FIX coin: X 寬 0.50m，規格 0.30m → 在 Blender 沿 X 軸縮放 0.600 後 apply scale；Y 高 0.50m，規格 0.30m → 在 Blender 沿 Z 軸縮放 0.600 後 apply scale；Z 深 0.08m，規格 0.06m → 在 Blender 沿 Y 軸縮放 0.750 後 apply scale
- 判斷: 建模問題（規格變更，Blender / Godot 尺寸一致偏大）
- 對 Blender 的請求: coin 物件以原點（底部中心）為基準縮放 (X 0.6, Y 0.75, Z 0.6)，由標準 snippet apply scale 後重新匯出
- 結果: FAIL（iter 1，符合預期：確認判斷機制有效）

## 2026-10-26 10:43 coin iter 2（規格變更後）
- check: PASS（0.30 × 0.30 × 0.06 m、252 tris）
- 判斷: —
- 對 Blender 的請求: —（依 iter 1 的 FIX 縮放後通過）
- 結果: PASS
- Godot 端同步：Coin SphereShape3D 半徑 0.5 → 0.3；bot_test PASS（COIN 3/3、WIN）；run_project 無錯誤，截圖中金幣縮小且仍可見

## 2026-10-26 11:01 Phase 8 資產（箱庭世界）
每個資產都是 iter 1 PASS，沒有走到 FIX 迴圈：

| 資產 | 尺寸（Godot X × Y × Z） | tris / 上限 | 碰撞 | 備註 |
|---|---|---|---|---|
| player | 0.70 × 1.20 × 0.51 | 1696 / 3000 | none | 單輪機器人；`robot_wheel` 原點在輪心，action `wheel_spin` 1 秒一圈（線性） |
| tree | 2.00 × 3.50 × 2.00 | 108 / 1000 | col | 只有 `tree_trunk-col` 有碰撞 |
| bush | 1.20 × 0.70 × 1.00 | 400 / 600 | none | |
| rock | 1.40 × 0.90 × 1.20 | 120 / 400 | col | |
| barrel | 0.60 × 0.80 × 0.60 | 220 / 400 | none | Godot 端用 RigidBody3D |
| wall_brick | 4.00 × 1.60 × 0.50 | 860 / 2500 | col | 碰撞只在 `wall_core-col`，凸出的磚塊不加 |
| house | 4.00 × 4.00 × 3.50 | 522 / 2500 | col | 門窗木框在 `house_detail`（無碰撞） |
| mage_tower | 3.20 × 8.00 × 3.20 | 1036 / 3000 | col | |
| temple_ruins | 6.00 × 4.00 × 4.00 | 700 / 3000 | col | 祭壇浮空水晶、碎石在 `temple_ruins_detail` |

- 做法：Blender 端註冊共用 bmesh helper（`bpy.app.driver_namespace["H"]`，不存進 .blend）；建完用 `fit()` 把整個 collection 對齊 size_m 和 bottom_center
- 匯出前一律「所有 collection 可見 + 全部取消選取」，沿用 player iter 1 學到的做法

## 2026-10-26 11:07 player iter 2（Phase 8）
- check: PASS，但 iter 1 的 glb 有 check 沒抓到的問題：Godot 匯入把名稱結尾 `_wheel` 當匯入提示，`robot_wheel` 變成 VehicleWheel3D、名稱被截成 `robot`
- 判斷: pipeline 問題（Godot 節點名稱後綴提示：-col / -rigid / -vehicle / -wheel 等，`_` 也算）
- 對 Blender 的請求: 輪子物件改名 `robot_tire` 後重新匯出；用 headless 腳本確認輪子是 MeshInstance3D、`wheel_spin` 軌道路徑為 `robot_tire`
- 結果: PASS
- 附帶：匯出的 `wheel_spin` 長度 1.04 s（第 1.0 s 轉完一圈）；Godot 端執行時把 length 設成最後一個 key 的時間，避免循環時停頓

## 2026-10-26 11:10 Phase 8 Godot 端（與 PLAYBOOK 的差異與測試發現）
- 偏離 PLAYBOOK（使用者選擇）：鏡頭改等角 45° 跟隨，方向鍵改成相對鏡頭移動；bot 模式仍走世界座標直線
- 偏離 PLAYBOOK：player.gd 的「速度 4 m/s」改成力模型 `a = F/m − k·v` 加滾動摩擦 μg，F 取 `m(μg + k·4)` 讓極速剛好 4 m/s；Player capsule 改 r 0.3 / h 1.2
- physics_test 抓到：空中阻力太小（0.5）時按住方向跳躍會一直加速（極速約 10 m/s）→ 空中阻力改成讓空中極速也是 4 m/s
- 診斷：推木桶時 CharacterBody 撞上就把自己速度歸零，只有接觸那一格有推力，而且衝量打在接觸點把木桶推倒 → 改成撞擊瞬間依折合質量傳遞動量 + 接觸時加驅動力，作用在質心；木桶被推 2.13 m 且保持直立
- 落葉粒子 0.14 m 在鏡頭距離下看不清楚 → 放大到 0.22 m、數量 32

## 2026-10-26 11:30 crate iter 1（Phase 9 規格變更）
- check: FAIL — FIX crate: X 寬 1.00m，規格 0.80m → 在 Blender 沿 X 軸縮放 0.800 後 apply scale（Y、Z 同）
- 判斷: 建模問題（使用者回饋木箱和場景不搭：素面方塊 + 粗框條、尺寸偏大）；不只縮放，依新 desc 重做
- 對 Blender 的請求: 重做為 0.8 m 中世紀木板箱（木板縫、斜撐、鐵角片），碰撞只放在簡單牆芯 `crate_core-col`
- 結果: FAIL（iter 1，規格變更預期中）

## 2026-10-26 11:26 crate iter 2 / cloud iter 1（Phase 9）
- check: PASS — crate 0.80 × 0.80 × 0.80 m、540 tris、has_collision=true；cloud 5.00 × 1.60 × 3.00 m、480 tris
- 判斷: —
- 對 Blender 的請求: —
- 結果: PASS

## 2026-10-26 11:30 Phase 9 Godot 端
- 偏離 PLAYBOOK：Crates 三個主木箱不再用 Phase 5 配置表的座標，改放在村莊院子 (13.2, −5.6)、西南菜園角落 (−9.2, 13.6)，以及疊在南邊木箱上 (4.55, 0.8, 11.05)；都離 bot 路線 2 m 以上
- 輸入：新增 boost（鍵盤 A 實體鍵、手把 X）/ brake（鍵盤 B 實體鍵、手把 B）；Godot 4.7 預設 `ui_accept` 沒有手把 A，在 project.godot 覆寫 ui_accept 補上 Joypad Button 0；CLAUDE.md 的輸入規則同步更新
- 加速 / 煞車沿用力模型：加速把極速參數換成 7 m/s（推力隨之變大）；煞車切斷推力、摩擦係數 0.15 → 0.8。physics_test：加速極速 7.00 m/s、煞車 23 格停下（滑行 44 格）
- 雲影一開始幾乎看不到：雲以地圖中心隨機分布，但太陽在西南、雲高 15 m，影子往東北偏約 18 m，大多落在地圖外 → clouds.gd 依太陽方向把雲的漂移範圍往反方向挪
- 全景截圖的遠半邊沒有陰影：鏡頭距離 64 m 超過 directional_shadow_max_distance 60 → `--overview` 時把陰影距離改為鏡頭距離 ×2
- 微風：樹 0.3°–1.4°、草叢 0.8°–2.9° 持續擺動（headless 取樣確認）；陣風相位依位置沿風向推進

## 2026-10-26 11:43 terrain iter 1（Phase 10）
- check: PASS — 41.00 × 2.65 × 41.00 m、30,634 tris、has_collision=true（只有 `terrain_ground-col`）
- 判斷: —
- 對 Blender 的請求: —
- 結果: PASS
- 規格修正（匯出前）：terrain 高度原本估 2.4 m（1.5 m 土層 + 0.9 m 起伏），沒算到山頂草叢約 0.25 m，實際 2.645 m；desc 本來就含草叢，改為 2.6 m
- 調整（匯出前）：第一版草地每個三角面隨機色差太大、像碎紙片 → 縮小深淺色差、降低隨機成分；石板路底改偏土色，鋸齒邊比較不突兀

## 2026-10-26 11:40 Phase 10 地形資料流
- 版面資料從 build_world.mjs 抽到 `world_layout.json`（抽出後 world.tscn 輸出逐字相同）；Blender 地形腳本與 builder 都讀它
- 平整區塊：建築 / 圍牆 / 木箱 / 木桶的實際佔地（assets.json 尺寸 × scale × yaw）、道路、廣場、`flat_pads`（起點、金幣、終點、main.tscn 的木箱）、牆邊 2 m 全部壓平，外圍 2.5 m 漸變；main.tscn 的遊戲節點因此不用改高度
- 高度表：Blender 另外寫出 `pipeline/terrain_heights.json`（0.5 m 格網）。這是資料檔，不是模型匯出；模型仍用附錄 A 標準 snippet
- builder 依高度表擺放（樹 / 石頭 / 草叢下沉 3–10 cm），並檢查 flat_pads 高度都在 ±0.03 m 內，否則報錯要求重匯地形
- main.tscn：Ground 改為 terrain.glb instance（y = −1.5），移除平面 mesh 與 BoxShape；Player `floor_snap_length = 0.3`
- physics_test：起點高度改成「目標底部 + 0.5 m」，避免在坡地上生成在地面以下

