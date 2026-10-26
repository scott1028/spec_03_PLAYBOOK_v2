extends RefCounted
# Shared wind: clouds drift and plants lean along the same direction.

const DIRECTION := Vector3(0.96, 0, 0.28)  # mostly east, a little south (unit length)
const CLOUD_SPEED := 1.2  # m/s
const GUST_WAVELENGTH := 18.0  # m, gusts roll across the map along DIRECTION
