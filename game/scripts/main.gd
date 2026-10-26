extends Node3D

const TOTAL_COINS := 3
const SCREENSHOT_DELAY := 3.0
# Isometric follow camera: looks north-west from the south-east
const CAMERA_YAW := PI / 4
const CAMERA_PITCH := -0.698  # -40 deg
const CAMERA_FOV := 40.0
const CAMERA_DISTANCE := 18.0
const OVERVIEW_DISTANCE := 64.0
const OVERVIEW_TARGET := Vector3(4, 0, 4)  # nudged toward the camera so the near corner fits
const FOLLOW_SPEED := 4.0
const LOOK_HEIGHT := 0.6
# Tilt-shift: sharp band around the focus, as fractions of the camera distance
const NEAR_BLUR_END := 0.89
const NEAR_BLUR_TRANSITION := 0.17
const FAR_BLUR_START := 1.22
const FAR_BLUR_TRANSITION := 0.55

var coin_count := 0
var is_won := false
var is_bot := "--bot" in OS.get_cmdline_user_args()
var is_overview := "--overview" in OS.get_cmdline_user_args()
var camera_distance := OVERVIEW_DISTANCE if is_overview else CAMERA_DISTANCE
var follow_target := Vector3.ZERO

@onready var player: CharacterBody3D = $Player
@onready var camera: Camera3D = $Camera3D


func _ready() -> void:
	for coin in $Coins.get_children():
		coin.collected.connect(_on_coin_collected)
	$Goal.reached.connect(_on_goal_reached)
	camera.fov = CAMERA_FOV
	camera.global_basis = Basis.from_euler(Vector3(CAMERA_PITCH, CAMERA_YAW, 0))
	var tilt_shift := camera.attributes as CameraAttributesPractical
	tilt_shift.dof_blur_near_distance = camera_distance * NEAR_BLUR_END
	tilt_shift.dof_blur_near_transition = camera_distance * NEAR_BLUR_TRANSITION
	tilt_shift.dof_blur_far_distance = camera_distance * FAR_BLUR_START
	tilt_shift.dof_blur_far_transition = camera_distance * FAR_BLUR_TRANSITION
	if is_overview:
		# The overview camera sits past the default shadow range; extend it so the far half keeps its shadows
		($DirectionalLight3D as DirectionalLight3D).directional_shadow_max_distance = camera_distance * 2.0
	update_camera(1.0, true)
	# Screenshots go to ../pipeline for review; the web build has no such folder
	if DisplayServer.get_name() != "headless" and not OS.has_feature("web"):
		get_tree().create_timer(SCREENSHOT_DELAY).timeout.connect(save_screenshot)


func _process(delta: float) -> void:
	update_camera(delta)


func update_camera(delta: float, is_snap := false) -> void:
	var target := OVERVIEW_TARGET if is_overview else player.global_position
	follow_target = target if is_snap else follow_target.lerp(target, 1.0 - exp(-FOLLOW_SPEED * delta))
	camera.global_position = follow_target + Vector3.UP * LOOK_HEIGHT + camera.global_basis.z * camera_distance


func save_screenshot() -> void:
	await RenderingServer.frame_post_draw
	var file_name := "screenshot_overview.png" if is_overview else "screenshot.png"
	var path := ProjectSettings.globalize_path("res://").path_join("../pipeline/" + file_name)
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
