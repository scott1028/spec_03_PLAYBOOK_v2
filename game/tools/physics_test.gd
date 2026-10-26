extends SceneTree
# 用法：godot --headless --path game --fixed-fps 60 -s res://tools/physics_test.gd
# Velocity model function checks + in-scene checks (robot hits a tree, pushes a barrel).

const Player := preload("res://scripts/player.gd")
const DT := 1.0 / 60.0
const TREE_NEAR := Vector3(-13.5, 0, -2)
const BARREL_NEAR := Vector3(14, 0, -3)
const START_DISTANCE := 1.6

var failures: Array[String] = []


func _init() -> void:
	run.call_deferred()


func run() -> void:
	check_velocity_model()
	var main: Node3D = load("res://scenes/main.tscn").instantiate()
	root.add_child(main)
	await physics_frame
	await check_tree_hit(main)
	await check_barrel_push(main)
	print("PHYSICS_TEST: %s" % ("PASS" if failures.is_empty() else "FAIL"))
	quit(0 if failures.is_empty() else 1)


func expect(is_ok: bool, label: String) -> void:
	print("  %s %s" % ["PASS" if is_ok else "FAIL", label])
	if not is_ok:
		failures.append(label)


func check_velocity_model() -> void:
	var g: float = ProjectSettings.get_setting("physics/3d/default_gravity")
	var step := func(v: Vector3, dir: Vector3, on_floor: bool, top_speed: float, is_braking: bool) -> Vector3:
		return Player.step_velocity(v, dir, on_floor, top_speed, is_braking, g, DT)
	var v := Vector3.ZERO
	for i in 90:
		v = step.call(v, Vector3.RIGHT, true, Player.MAX_SPEED, false)
	expect(v.length() > 3.8 and v.length() < 4.05, "top speed after 1.5 s = %.2f m/s" % v.length())
	for i in 60:
		v = step.call(v, Vector3.ZERO, true, Player.MAX_SPEED, false)
	expect(v.is_zero_approx(), "friction stops the robot within 1 s (%.3f m/s)" % v.length())
	var ground := Vector3.ZERO
	var air := Vector3.ZERO
	for i in 6:
		ground = step.call(ground, Vector3.RIGHT, true, Player.MAX_SPEED, false)
		air = step.call(air, Vector3.RIGHT, false, Player.MAX_SPEED, false)
	expect(air.length() < ground.length() * 0.5, "air control is weaker after 0.1 s (air %.2f vs ground %.2f)" % [air.length(), ground.length()])
	air = Vector3.RIGHT * Player.MAX_SPEED
	for i in 60:
		air = step.call(air, Vector3.RIGHT, false, Player.MAX_SPEED, false)
	expect(air.length() <= Player.MAX_SPEED + 0.01, "jumping does not exceed top speed (%.2f m/s)" % air.length())
	v = Vector3.ZERO
	for i in 120:
		v = step.call(v, Vector3.RIGHT, true, Player.BOOST_SPEED, false)
	expect(v.length() > 6.7 and v.length() < 7.05, "boost top speed after 2 s = %.2f m/s" % v.length())
	var coast_frames := count_stop_frames(step, Player.BOOST_SPEED, false)
	var brake_frames := count_stop_frames(step, Player.BOOST_SPEED, true)
	expect(brake_frames <= 30 and brake_frames < coast_frames * 0.7, "brake stops from 7 m/s in %d frames (coasting %d)" % [brake_frames, coast_frames])


func count_stop_frames(step: Callable, speed: float, is_braking: bool) -> int:
	var v := Vector3.RIGHT * speed
	var frames := 0
	while not v.is_zero_approx() and frames < 600:
		# Brake test still holds the direction key: braking must override the drive
		v = step.call(v, Vector3.RIGHT if is_braking else Vector3.ZERO, true, Player.MAX_SPEED, is_braking)
		frames += 1
	return frames


# Place the robot so `target` is straight ahead on ui_up, then hold ui_up.
func drive_into(main: Node3D, target: Node3D, frames: int, is_done: Callable) -> void:
	var player := main.get_node("Player") as CharacterBody3D
	var camera := main.get_node("Camera3D") as Camera3D
	var forward := Vector3(-camera.global_basis.z.x, 0, -camera.global_basis.z.z).normalized()
	# Start a little above the target base; the terrain may slope between the two
	player.global_position = Vector3(target.global_position.x, target.global_position.y + 0.5, target.global_position.z) - forward * START_DISTANCE
	player.velocity = Vector3.ZERO
	Input.action_press("ui_up")
	for i in frames:
		await physics_frame
		if is_done.call():
			break
	Input.action_release("ui_up")


func find_nearest(group: Node, point: Vector3) -> Node3D:
	var nearest: Node3D = null
	for child in group.get_children():
		if nearest == null or child.global_position.distance_to(point) < nearest.global_position.distance_to(point):
			nearest = child
	return nearest


func check_tree_hit(main: Node3D) -> void:
	var tree := find_nearest(main.get_node("World/Trees"), TREE_NEAR)
	var leaves := tree.get_node("Leaves") as CPUParticles3D
	await drive_into(main, tree, 120, func() -> bool: return leaves.emitting)
	expect(leaves.emitting, "%s drops leaves when the robot hits it" % tree.name)
	expect(tree.angle.length() > 0.005, "%s sways after the hit (%.3f rad)" % [tree.name, tree.angle.length()])


func check_barrel_push(main: Node3D) -> void:
	var barrel := find_nearest(main.get_node("World/Barrels"), BARREL_NEAR)
	var start := barrel.global_position
	await drive_into(main, barrel, 120, func() -> bool: return false)
	var moved := Vector2(barrel.global_position.x - start.x, barrel.global_position.z - start.z).length()
	expect(moved > 0.3, "%s is pushed %.2f m" % [barrel.name, moved])
