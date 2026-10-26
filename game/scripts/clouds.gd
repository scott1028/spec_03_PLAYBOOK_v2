extends Node3D
# Low-poly clouds drifting with the wind; their shadows sweep across the diorama.

const Wind := preload("res://scripts/wind.gd")
const CLOUD_SCENE := preload("res://assets/cloud.glb")
const COUNT := 10
const AREA_HALF := 34.0  # clouds wrap around inside this square
const HEIGHT_MIN := 13.0  # above the follow camera, so only their shadows show up close-up
const HEIGHT_MAX := 17.0

@export var sun: DirectionalLight3D

var area_center := Vector3.ZERO


func _ready() -> void:
	# Shadows land downwind of the sun; shift the cloud area back so the shadows cover the map
	var light_dir := -sun.global_basis.z
	var mean_height := (HEIGHT_MIN + HEIGHT_MAX) / 2
	area_center = -Vector3(light_dir.x, 0, light_dir.z) * mean_height / -light_dir.y
	var rng := RandomNumberGenerator.new()
	rng.seed = 2026
	for i in COUNT:
		var cloud: Node3D = CLOUD_SCENE.instantiate()
		cloud.position = area_center + Vector3(rng.randf_range(-AREA_HALF, AREA_HALF), rng.randf_range(HEIGHT_MIN, HEIGHT_MAX), rng.randf_range(-AREA_HALF, AREA_HALF))
		cloud.rotation.y = rng.randf_range(-0.4, 0.4)
		cloud.scale = Vector3.ONE * rng.randf_range(0.9, 1.7)
		add_child(cloud)


func _process(delta: float) -> void:
	for cloud: Node3D in get_children():
		var p := cloud.position + Wind.DIRECTION * Wind.CLOUD_SPEED * delta - area_center
		cloud.position = area_center + Vector3(wrapf(p.x, -AREA_HALF, AREA_HALF), p.y, wrapf(p.z, -AREA_HALF, AREA_HALF))
