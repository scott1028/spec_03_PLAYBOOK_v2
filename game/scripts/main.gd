extends Node3D

const TOTAL_COINS := 3
const CAMERA_OFFSET := Vector3(0, 8, 8)
const SCREENSHOT_DELAY := 3.0

var coin_count := 0
var is_won := false
var is_bot := "--bot" in OS.get_cmdline_user_args()

@onready var player: CharacterBody3D = $Player
@onready var camera: Camera3D = $Camera3D


func _ready() -> void:
	for coin in $Coins.get_children():
		coin.collected.connect(_on_coin_collected)
	$Goal.reached.connect(_on_goal_reached)
	follow_player()
	if DisplayServer.get_name() != "headless":
		get_tree().create_timer(SCREENSHOT_DELAY).timeout.connect(save_screenshot)


func _process(_delta: float) -> void:
	follow_player()


func follow_player() -> void:
	camera.global_position = player.global_position + CAMERA_OFFSET
	camera.look_at(player.global_position)


func save_screenshot() -> void:
	await RenderingServer.frame_post_draw
	var path := ProjectSettings.globalize_path("res://").path_join("../pipeline/screenshot.png")
	var err := get_viewport().get_texture().get_image().save_png(path)
	print("SCREENSHOT %s (%s)" % [path, error_string(err)])


func _on_coin_collected() -> void:
	coin_count += 1
	print("COIN %d/%d" % [coin_count, TOTAL_COINS])


func _on_goal_reached() -> void:
	if is_won:
		return
	if coin_count < TOTAL_COINS:
		print("NEED_COINS")
		return
	is_won = true
	print("WIN")
	if is_bot:
		get_tree().quit()
