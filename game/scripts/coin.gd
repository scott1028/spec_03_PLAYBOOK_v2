extends Area3D

signal collected

const SPIN_SPEED := PI  # 180 deg per second


func _ready() -> void:
	body_entered.connect(_on_body_entered)


func _process(delta: float) -> void:
	rotate_y(SPIN_SPEED * delta)


func _on_body_entered(body: Node3D) -> void:
	if body.name == "Player":
		collected.emit()
		queue_free()
