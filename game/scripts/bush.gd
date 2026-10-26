extends "res://scripts/sway.gd"
# Bush: no collision, wobbles along the motion of whatever passes through it.

const MIN_SPEED := 0.1

@onready var trigger: Area3D = $Trigger


func _ready() -> void:
	trigger.body_entered.connect(_on_body_moved)
	trigger.body_exited.connect(_on_body_moved)


func _on_body_moved(body: Node3D) -> void:
	var body_velocity := Vector3.ZERO
	if body is CharacterBody3D:
		body_velocity = (body as CharacterBody3D).velocity
	elif body is RigidBody3D:
		body_velocity = (body as RigidBody3D).linear_velocity
	body_velocity.y = 0
	if body_velocity.length() >= MIN_SPEED:
		push(body_velocity, body_velocity.length())
