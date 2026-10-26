extends Node3D
# Damped spring sway: push() tips $Model away, then it springs back upright.
# Wind adds a gentle downwind lean whose gusts roll across the map.

const Wind := preload("res://scripts/wind.gd")

@export var stiffness := 40.0
@export var damping := 5.0
@export var push_gain := 0.15  # angular velocity (rad/s) per m/s of impact
@export var max_angle := 0.35
@export var wind_amplitude := 0.0  # rad
@export var wind_frequency := 0.4  # Hz

var angle := Vector2.ZERO  # local tilt toward +X / +Z from pushes
var angular_velocity := Vector2.ZERO
var wind_time := 0.0
var wind_local := Vector2.ZERO
var wind_phase := 0.0

@onready var model: Node3D = $Model


func _ready() -> void:
	var local := global_basis.inverse() * Wind.DIRECTION
	wind_local = Vector2(local.x, local.z).normalized()
	wind_phase = TAU * global_position.dot(Wind.DIRECTION) / Wind.GUST_WAVELENGTH


func push(direction: Vector3, strength: float) -> void:
	var local_dir := global_basis.inverse() * direction
	angular_velocity += Vector2(local_dir.x, local_dir.z).normalized() * strength * push_gain


func _physics_process(delta: float) -> void:
	wind_time += delta
	if not (angle.is_zero_approx() and angular_velocity.is_zero_approx()):
		angular_velocity += (-stiffness * angle - damping * angular_velocity) * delta
		angle = (angle + angular_velocity * delta).limit_length(max_angle)
		if angle.length() < 0.0005 and angular_velocity.length() < 0.005:
			angle = Vector2.ZERO
			angular_velocity = Vector2.ZERO
	var gust := 0.6 + 0.4 * sin(TAU * wind_frequency * wind_time - wind_phase)
	var tilt2 := angle + wind_local * wind_amplitude * gust
	var tilt := Vector3(tilt2.x, 0, tilt2.y)
	# Rotating around UP x tilt tips the top toward the tilt direction; pivot is the model origin (bottom center)
	model.basis = Basis(Vector3.UP.cross(tilt.normalized()), tilt.length()) if tilt.length() > 0.0001 else Basis.IDENTITY
