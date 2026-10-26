extends Node3D
# Damped spring sway: push() tips $Model away, then it springs back upright.

@export var stiffness := 40.0
@export var damping := 5.0
@export var push_gain := 0.15  # angular velocity (rad/s) per m/s of impact
@export var max_angle := 0.35

var angle := Vector2.ZERO  # local tilt toward +X / +Z
var angular_velocity := Vector2.ZERO

@onready var model: Node3D = $Model


func push(direction: Vector3, strength: float) -> void:
	var local_dir := global_basis.inverse() * direction
	angular_velocity += Vector2(local_dir.x, local_dir.z).normalized() * strength * push_gain


func _physics_process(delta: float) -> void:
	if angle.is_zero_approx() and angular_velocity.is_zero_approx():
		return
	angular_velocity += (-stiffness * angle - damping * angular_velocity) * delta
	angle = (angle + angular_velocity * delta).limit_length(max_angle)
	if angle.length() < 0.0005 and angular_velocity.length() < 0.005:
		angle = Vector2.ZERO
		angular_velocity = Vector2.ZERO
	var tilt := Vector3(angle.x, 0, angle.y)
	# Rotating around UP x tilt tips the top toward the tilt direction; pivot is the model origin (bottom center)
	model.basis = Basis(Vector3.UP.cross(tilt.normalized()), tilt.length()) if angle != Vector2.ZERO else Basis.IDENTITY
