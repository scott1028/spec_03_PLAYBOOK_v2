extends CharacterBody3D

const SPEED := 4.0
const JUMP_VELOCITY := 4.5
const REACH_DISTANCE := 0.3
const BOT_TARGET_PATHS := ["../Coins/Coin1", "../Coins/Coin2", "../Coins/Coin3", "../Goal"]

var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")
var is_bot := "--bot" in OS.get_cmdline_user_args()
var bot_targets: Array[Vector3] = []
var bot_target_index := 0

@onready var visual: Node3D = $Visual


func _ready() -> void:
	if is_bot:
		# Store positions; coins are freed once collected
		for path in BOT_TARGET_PATHS:
			bot_targets.append((get_node(path) as Node3D).global_position)


func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= gravity * delta

	var dir := get_bot_direction() if is_bot else get_input_direction()
	if not is_bot and Input.is_action_just_pressed("ui_accept") and is_on_floor():
		velocity.y = JUMP_VELOCITY

	velocity.x = dir.x * SPEED
	velocity.z = dir.z * SPEED
	if dir != Vector3.ZERO:
		# glb front is +Z
		visual.rotation.y = atan2(dir.x, dir.z)
	move_and_slide()


func get_input_direction() -> Vector3:
	var input := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
	return Vector3(input.x, 0, input.y).normalized()


func get_bot_direction() -> Vector3:
	while bot_target_index < bot_targets.size():
		var offset := bot_targets[bot_target_index] - global_position
		offset.y = 0
		if offset.length() >= REACH_DISTANCE:
			return offset.normalized()
		bot_target_index += 1
	return Vector3.ZERO
