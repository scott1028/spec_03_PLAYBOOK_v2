extends "res://scripts/sway.gd"
# Tree: sways when hit, and drops leaves on a hard enough hit.

const LEAF_MIN_STRENGTH := 1.0
const LEAF_COOLDOWN_FRAMES := 36

var last_leaf_frame := -LEAF_COOLDOWN_FRAMES

@onready var leaves: CPUParticles3D = $Leaves


func push(direction: Vector3, strength: float) -> void:
	super.push(direction, strength)
	var frame := Engine.get_physics_frames()
	if strength >= LEAF_MIN_STRENGTH and frame - last_leaf_frame >= LEAF_COOLDOWN_FRAMES:
		last_leaf_frame = frame
		leaves.restart()
		print("TREE_HIT %s %.2f" % [name, strength])
