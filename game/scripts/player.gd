extends CharacterBody3D
# Unicycle robot driven by forces: a = F/m - drag*v, plus rolling friction on the ground.

const MAX_SPEED := 4.0
const BOOST_SPEED := 7.0
const MASS := 2.0
const DRAG := 4.0  # 1/s, linear resistance on the ground
const ROLLING_FRICTION := 0.15  # mu
const BRAKE_FRICTION := 0.8  # mu with the wheel locked
const AIR_CONTROL := 0.3
const JUMP_VELOCITY := 4.5
const REACH_DISTANCE := 0.3
const WHEEL_RADIUS := 0.16
const LEAN_PER_ACCEL := 0.04  # rad per m/s^2
const MAX_LEAN := 0.3
const LEAN_RESPONSE := 10.0
const HIT_MIN_SPEED := 0.5
const BOT_TARGET_PATHS := ["../Coins/Coin1", "../Coins/Coin2", "../Coins/Coin3", "../Goal"]

var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")
var drive_force := get_drive_force(MAX_SPEED, gravity)
var is_bot := "--bot" in OS.get_cmdline_user_args()
var bot_targets: Array[Vector3] = []
var bot_target_index := 0
var last_horizontal_velocity := Vector3.ZERO
var lean := Vector3.ZERO
var facing_yaw := 0.0
var wheel_revolution_time := 1.0

@onready var visual: Node3D = $Visual
@onready var wheel_anim: AnimationPlayer = $Visual/AnimationPlayer


func _ready() -> void:
	var anim := wheel_anim.get_animation("wheel_spin")
	anim.loop_mode = Animation.LOOP_LINEAR
	# One revolution ends at the last key; drop the hold after it so the loop is seamless
	anim.length = anim.track_get_key_time(0, anim.track_get_key_count(0) - 1)
	wheel_revolution_time = anim.length
	wheel_anim.play("wheel_spin")
	wheel_anim.speed_scale = 0.0
	if is_bot:
		# Store positions; coins are freed once collected
		for path in BOT_TARGET_PATHS:
			bot_targets.append((get_node(path) as Node3D).global_position)


func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= gravity * delta
	if not is_bot and Input.is_action_just_pressed("ui_accept") and is_on_floor():
		velocity.y = JUMP_VELOCITY

	var dir := get_bot_direction() if is_bot else get_input_direction()
	var is_braking := not is_bot and Input.is_action_pressed("brake")
	var top_speed := BOOST_SPEED if not is_bot and Input.is_action_pressed("boost") else MAX_SPEED
	drive_force = get_drive_force(top_speed, gravity)
	var horizontal := step_velocity(Vector3(velocity.x, 0, velocity.z), dir, is_on_floor(), top_speed, is_braking, gravity, delta)
	velocity.x = horizontal.x
	velocity.z = horizontal.z

	var pre_slide_velocity := velocity
	move_and_slide()
	handle_collisions(pre_slide_velocity, delta)
	update_visual(delta)


static func get_drive_force(top_speed: float, g: float) -> float:
	# Terminal ground speed equals top_speed: F/m = mu*g + DRAG*top_speed
	return MASS * (ROLLING_FRICTION * g + DRAG * top_speed)


static func step_velocity(v: Vector3, dir: Vector3, on_floor: bool, top_speed: float, is_braking: bool, g: float, delta: float) -> Vector3:
	if is_braking:
		dir = Vector3.ZERO  # braking cuts the drive
	var force := get_drive_force(top_speed, g)
	var drive := force if on_floor else force * AIR_CONTROL
	# Air drag keeps the air terminal speed at top_speed, so jumping never speeds the robot up
	var drag := DRAG if on_floor else drive / (MASS * top_speed)
	v += (dir * drive / MASS - v * drag) * delta
	if on_floor:
		# Rolling (or braking) friction: constant deceleration against motion, never reverses it
		var friction := BRAKE_FRICTION if is_braking else ROLLING_FRICTION
		v = v.normalized() * maxf(v.length() - friction * g * delta, 0.0)
	return v


func handle_collisions(pre_slide_velocity: Vector3, delta: float) -> void:
	for i in get_slide_collision_count():
		var collision := get_slide_collision(i)
		var normal := collision.get_normal()
		var collider := collision.get_collider()
		if collider is RigidBody3D:
			var body := collider as RigidBody3D
			var push_dir := Vector3(-normal.x, 0, -normal.z).normalized()
			# Inelastic hit: impulse = reduced mass * closing speed, plus the drive force while in contact
			var closing_speed := maxf((pre_slide_velocity - body.linear_velocity).dot(push_dir), 0.0)
			var reduced_mass := MASS * body.mass / (MASS + body.mass)
			body.apply_central_impulse(push_dir * (reduced_mass * closing_speed + drive_force * delta))
			continue
		var impact_speed := -pre_slide_velocity.dot(normal)
		if impact_speed < HIT_MIN_SPEED:
			continue
		var target := find_pushable(collider as Node)
		if target:
			target.push(-normal, impact_speed)


func find_pushable(node: Node) -> Node:
	while node and not node.has_method("push"):
		node = node.get_parent()
	return node


func update_visual(delta: float) -> void:
	var horizontal := Vector3(velocity.x, 0, velocity.z)
	var accel := (horizontal - last_horizontal_velocity) / delta
	last_horizontal_velocity = horizontal
	if horizontal.length() > 0.2:
		facing_yaw = atan2(horizontal.x, horizontal.z)
	# Lean the body toward the acceleration, pivoting on the wheel contact
	lean = lean.lerp((accel * LEAN_PER_ACCEL).limit_length(MAX_LEAN), 1.0 - exp(-LEAN_RESPONSE * delta))
	var tilt := Basis(Vector3.UP.cross(lean.normalized()), lean.length()) if lean.length() > 0.001 else Basis.IDENTITY
	# glb front is +Z
	visual.basis = tilt * Basis(Vector3.UP, facing_yaw)
	# Roll without slipping: revolutions per second = v / (2 pi r)
	var forward_speed := horizontal.dot(Vector3(sin(facing_yaw), 0, cos(facing_yaw)))
	wheel_anim.speed_scale = forward_speed / (TAU * WHEEL_RADIUS) * wheel_revolution_time


func get_input_direction() -> Vector3:
	var input := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
	var camera := get_viewport().get_camera_3d()
	if camera == null:
		return Vector3(input.x, 0, input.y)
	# Move relative to the camera, flattened onto the ground
	var right := Vector3(camera.global_basis.x.x, 0, camera.global_basis.x.z).normalized()
	var forward := Vector3(-camera.global_basis.z.x, 0, -camera.global_basis.z.z).normalized()
	return (right * input.x - forward * input.y).limit_length(1.0)


func get_bot_direction() -> Vector3:
	while bot_target_index < bot_targets.size():
		var offset := bot_targets[bot_target_index] - global_position
		offset.y = 0
		if offset.length() >= REACH_DISTANCE:
			return offset.normalized()
		bot_target_index += 1
	return Vector3.ZERO
