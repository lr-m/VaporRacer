import * as THREE from "../three.js-dev/build/three.module.js";

export default function Car() {
	this.car_mesh;
	this.smashed_car_mesh;
	this.engine_mesh;

	this.car_speed = 1;
	this.car_speed_cap = 300;
	this.initial_max_speed = 75;

	// For floor planes
	this.car_hitbox;

	// For car animation
	this.sin_z = 0.0;
	this.sin_y = 0.0;

	// For lane change animation
	this.lane_sep = 1000;
	this.double = false;

	this.car_center_offset = 0;

	this.start_pos_x;
	this.target_pos_x;
	this.lane_change_iters = 45;
	this.lane_change = false;
	this.move_iters = 0;
	this.flip_iters = 0;

	// For height change animation
	this.height_sep = 1000;

	this.car_height_offset = 0;

	this.start_pos_y;
	this.target_pos_y;
	this.height_change_iters = 28;
	this.curr_height_change_iters = 0;
	this.height_change = false;

	this.particles = [];

	this.explosion_mesh;
	this.explosion_particles = [];
	this.explosion_particle_directions = [];
	this.engines = [];
	this.engine_directions = [];
	this.engine_fall_speeds = [];

	this.smashed_speed;
	this.explosion_complete = false;

	this.current_col = 1;
	this.current_row = 0;

	this.game_over_speed;

	/**
	 * Initialises the textures and raycaster/mouse used by the menu.
	 */
	this.initialise = function (scene) {
		this.initialiseRearParticles(scene);

		// Initialise the cars hitbox
		var cubeGeometry = new THREE.BoxGeometry(400, 300, 750);
		var wireMaterial = new THREE.MeshBasicMaterial({
			color: 0xff0000,
			wireframe: true,
		});
		this.car_hitbox = new THREE.Mesh(cubeGeometry, wireMaterial);
		this.car_hitbox.position.set(0, 450, -2500);
		this.car_hitbox.visible = false;
		this.car_hitbox.name = "Car Hitbox";
		scene.add(this.car_hitbox);
	};

	/**
	 * @returns Vertical lane seperation.
	 */
	this.getHeightSep = function () {
		return this.height_sep;
	};

	/**
	 * Get lane change flag..
	 * @returns Indicates if car is currently changing lane.
	 */
	this.isChangingLane = function () {
		return this.lane_change;
	};

	/**
	 * Get height change flag.
	 * @returns Indicates if car is currently changing height.
	 */
	this.isChangingHeight = function () {
		return this.height_change;
	};

	/**
	 * Set the class meshes to the loaded meshes.
	 * @param {*} car_mesh Imported car mesh.
	 * @param {*} smashed_car_mesh Imported smashed car mesh.
	 * @param {*} engine_mesh Imported engine mesh.
	 */
	this.initialiseMeshes = function (car_mesh, smashed_car_mesh, engine_mesh) {
		this.car_mesh = car_mesh;
		this.smashed_car_mesh = smashed_car_mesh;
		this.engine_mesh = engine_mesh;
	};

	/**
	 * Utility function that clears a list of objects from the scene.
	 * @param {list} List of objects to remove.
	 */
	this.clearListFromScene = function (list, scene) {
		for (var i = 0; i < list.length; i++) scene.remove(list[i]);

		list.length = 0;
	};

	/**
	 * Reset the car for a new game.
	 * @param {} scene Scene for old objects to be removed.
	 */
	this.reset = function (scene) {
		this.clearListFromScene(this.explosion_particles, scene);
		this.clearListFromScene(this.particles, scene);
		this.clearListFromScene(this.engines, scene);

		this.initialiseRearParticles(scene);

		if (this.explosion_mesh != undefined){
			scene.remove(this.explosion_mesh);
			this.explosion_mesh = undefined;
		}

		this.lane_change = false;
		this.move_iters = 0;
		this.flip_iters = 0;
		this.lane_change_iters = 45;

		this.curr_height_change_iters = 0;
		this.height_change = false;

		this.explosion_complete = false;

		this.smashed_car_mesh.visible = false;
		this.car_mesh.visible = true;
		this.car_speed = 0;
		this.car_mesh.rotation.x = 0;
		this.car_mesh.rotation.y = 0;
		this.car_mesh.rotation.z = 0;
		this.car_mesh.position.x = 0;
		this.car_center_offset = 0;
		this.car_mesh.position.y = 375;

		this.start_pos_y = this.car_mesh.position.y;
		this.target_pos_y = this.car_mesh.position.y;

		this.car_height_offset = 0;

		this.current_col = 1;
		this.current_row = 0;
	};

	/**
	 * Returns the cars current speed.
	 */
	this.getSpeed = function () {
		return this.car_speed;
	};

	/**
	 * Returns the cars speed when the game ended.
	 */
	this.getEndSpeed = function () {
		return this.game_over_speed;
	};

	/**
	 * Allows the cars speed to be set.
	 * @param {float} speed
	 */
	this.setSpeed = function (speed) {
		this.car_speed = speed;
	};

	/**
	 * This is the function that initialises the game over animation
	 * when the player hits an obstacle.
	 */
	this.hit = function (scene) {
		this.game_over_speed = this.car_speed;
		this.smashed_speed = this.car_speed;
		this.car_speed = 0;

		// Make brake light particles invisible
		for (let i = 0; i < this.particles.length; i++)
			this.particles[i].visible = false;

		// Create the main explosion sphere mesh
		const geometry = new THREE.IcosahedronGeometry(100, 2);
		var col = 0xffff00;
		const material = new THREE.MeshBasicMaterial({ color: col });
		this.explosion_mesh = new THREE.Mesh(geometry, material);

		scene.add(this.explosion_mesh);

		this.explosion_mesh.position.x = this.car_mesh.position.x;
		this.explosion_mesh.position.y = this.car_mesh.position.y;
		this.explosion_mesh.position.z = this.car_mesh.position.z + 250;

		// Initialise the explosion particles
		for (let i = 0; i < 50; i++) {
			const geometry = new THREE.IcosahedronGeometry(
				10 + 10 * Math.random(),
				2
			);
			var col;

			var rand = Math.random();

			if (rand < 0.25) {
				col = 0x000000;
			} else if (rand < 0.5) {
				col = 0x555555;
			} else if (rand < 0.75) {
				col = 0xff0000;
			} else {
				col = 0xffff00;
			}

			const material = new THREE.MeshBasicMaterial({ color: col });
			this.explosion_particles[i] = new THREE.Mesh(geometry, material);

			this.explosion_particles[i].position.x = this.car_mesh.position.x;
			this.explosion_particles[i].position.y = this.car_mesh.position.y;
			this.explosion_particles[i].position.z = this.car_mesh.position.z;

			scene.add(this.explosion_particles[i]);

			this.explosion_particle_directions[i] = [
				Math.random() * 2 * Math.PI,
				(Math.random() * Math.PI) / 2,
			];
		}

		// Initialise the falling engines
		for (let i = 0; i < 4; i++) {
			this.engines[i] = this.engine_mesh.clone();
			this.engine_directions[i] = -Math.PI / 24 + (i * Math.PI) / 36;
			scene.add(this.engines[i]);
			this.engine_fall_speeds[i] = 25 + Math.random() * 50;
		}
	};

	/**
	 * This function is executed after the hit function and gives the
	 * engines simple physics and animates everything to do with
	 * the explosion.
	 */
	this.afterHitPhysics = function () {
		// Displays explosion, then handles position changes
		if (this.explosion_mesh.scale.x > 5 && !this.explosion_complete) {
			this.explosion_complete = true;
			this.explosion_mesh.visible = false;

			// Move the smashed car and engines
			this.smashed_car_mesh.position.x = this.car_mesh.position.x;
			this.smashed_car_mesh.position.y = this.car_mesh.position.y;
			this.smashed_car_mesh.position.z = this.car_mesh.position.z;

			for (let i = 0; i < 4; i++) {
				this.engines[i].position.x = this.car_mesh.position.x;
				this.engines[i].position.y = this.car_mesh.position.y;
				this.engines[i].position.z = this.car_mesh.position.z;
			}

			this.smashed_car_mesh.visible = true;
			this.car_mesh.position.z = 1000;
		} else {
			// Explosion expands until desired radius reached
			this.explosion_mesh.scale.x *= 1.25;
			this.explosion_mesh.scale.y *= 1.25;
		}

		/* Move the small explosion particles downwards based on their 
        earlier given directions */
		for (let i = 0; i < this.explosion_particles.length; i++) {
			if (this.explosion_particles[i].position.y >= 50) {
				this.explosion_particles[i].position.x +=
					20 * Math.sin(this.explosion_particle_directions[i][0]);
				this.explosion_particles[i].position.y +=
					20 * Math.sin(this.explosion_particle_directions[i][1]) - 10;
				this.explosion_particles[i].position.z +=
					20 * Math.cos(this.explosion_particle_directions[i][0]) - 25;

				this.explosion_particle_directions[i][1] -= 0.05;
			}
		}

		/* Once the explosion is complete, apply simple gravity physics
        to engines, and make the smashed car smoothly fall */
		if (this.explosion_complete) {
			// Move smashed car mesh
			this.smashed_car_mesh.position.z -= this.smashed_speed / 2;
			this.smashed_speed /= 1.02;
			this.smashed_car_mesh.rotation.y += this.smashed_speed / 1250;

			if (this.smashed_car_mesh.position.y > 200)
				this.smashed_car_mesh.position.y -=
					(this.smashed_car_mesh.position.y - 200) / 50;

			// Simple engine gravity physics
			for (let i = 0; i < 4; i++) {
				this.engines[i].position.x -=
					this.smashed_speed * Math.sin(this.engine_directions[i]);
				this.engines[i].position.z -=
					this.smashed_speed * Math.cos(this.engine_directions[i]);

				this.engines[i].rotation.x +=
					(this.engine_directions[i] * this.smashed_speed) / 50;
				this.engines[i].rotation.y -=
					(this.engine_directions[i] * this.smashed_speed) / 50;
				this.engines[i].rotation.z +=
					(this.engine_directions[i] * this.smashed_speed) / 50;

				if (
					this.engines[i].position.y > 200 &&
					this.engine_fall_speeds[i] != 0
				) {
					this.engines[i].position.y -= this.engine_fall_speeds[i];
					this.engine_fall_speeds[i] += 1.5;
				} else {
					this.engine_fall_speeds[i] *= -0.5 - 0.3 * Math.random();
					this.engines[i].position.y -= this.engine_fall_speeds[i] / 0.65;
					this.engine_directions[i] =
						-Math.PI / 8 + (Math.random() * Math.PI) / 4;

					// To stop engines bouncing forever
					if (Math.abs(this.engine_fall_speeds[i]) < 10)
						this.engine_fall_speeds[i] = 0;
				}
			}
		}
	};

	/**
	 * Controls the movement of the car based on the user input.
	 */
	this.move = function () {
		this.rearParticles();

		// Move car forwards when game started
		if (this.car_mesh.position.z > -2500)
			this.car_mesh.position.z += (-2500 - this.car_mesh.position.z) * 0.05;

		// Update car speed
		if (!this.lane_change && !this.height_change) {
			if (this.car_speed < this.initial_max_speed)
				this.car_speed +=
					(this.initial_max_speed - this.car_speed) / this.initial_max_speed;

			if (this.car_speed < this.car_speed_cap)
				this.car_speed +=
					0.05 *
					(this.car_speed_cap - this.car_speed) / this.car_speed_cap;

			if (this.car_speed > this.initial_max_speed)
				this.lane_change_iters = 45 - Math.round(this.car_speed / 10);
		}

		// Ambient movement
		if (!this.lane_change && this.car_mesh != undefined) {
			this.car_mesh.rotation.z =
				Math.sin((this.sin_z += 0.05 * Math.random())) / 10;
			this.car_mesh.rotation.y =
				Math.sin((this.sin_y += 0.03 * Math.random())) / 25;
		}

		this.horizontalMovement();

		this.verticalMovement();
	};

	/**
	 * Controls the horizontal movement/animation of the car.
	 */
	this.horizontalMovement = function () {
		// Sideways flip animation
		if (this.lane_change && this.move_iters < this.lane_change_iters) {
			// Get influence of current iteration
			var move_influence =
				Math.abs(this.move_iters - this.lane_change_iters) /
				((this.lane_change_iters * (1 + this.lane_change_iters)) / 2);
			var flip_influence =
				Math.abs(this.flip_iters - this.lane_change_iters) /
				((this.lane_change_iters * (1 + this.lane_change_iters)) / 2);

			// Perform the rotation based on influences
			if (this.target_pos_x < this.start_pos_x) {
				this.car_mesh.rotation.z += 2 * Math.PI * flip_influence;
			} else {
				this.car_mesh.rotation.z -= 2 * Math.PI * flip_influence;
			}

			// Move the car based on influence
			this.car_mesh.position.x +=
				move_influence * (this.target_pos_x - this.start_pos_x);

			this.move_iters++;
			if (this.flip_iters < this.lane_change_iters) this.flip_iters++;
		} else if (this.lane_change) {
			// End of flip reached so reset variables
			this.car_center_offset = this.target_pos_x;
			this.lane_change = false;
			this.move_iters = 0;
			this.flip_iters = 0;
			this.double = false;
		}
	};

	/**
	 * Controls the vertical movement/animation of the car.
	 */
	this.verticalMovement = function () {
		// Upwards/downwards movement
		if (
			this.height_change &&
			this.curr_height_change_iters < this.height_change_iters
		) {
			// Calculate influence
			var influence =
				Math.abs(this.curr_height_change_iters - this.height_change_iters) /
				((this.height_change_iters * (1 + this.height_change_iters)) / 2);

			// Rotate car based on movement direction
			if (this.target_pos_y > this.start_pos_y) {
				this.car_mesh.rotation.x -=
					0.001 *
					(this.curr_height_change_iters - (this.height_change_iters - 1) / 2);
			} else {
				this.car_mesh.rotation.x +=
					0.001 *
					(this.curr_height_change_iters - (this.height_change_iters - 1) / 2);
			}

			// Update car y position
			this.car_height_offset +=
				influence * (this.target_pos_y - this.start_pos_y);
			this.car_mesh.position.y = this.start_pos_y + this.car_height_offset;

			this.curr_height_change_iters++;
		} else if (this.height_change) {
			// End of movement reached so reset variables
			this.car_mesh.position.y = this.target_pos_y;
			this.car_height_offset = 0;
			this.height_change = false;
			this.curr_height_change_iters = 0;
		}
	};

	/**
	 * Initialises the particles that come from the cars tail lights.
	 */
	this.initialiseRearParticles = function (scene) {
		for (let i = 0; i < 50; i++) {
			const boxWidth = 5,
				boxHeight = 5,
				boxDepth = 5;
			const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

			// Select orange, red, or white
			var col;
			var rand = Math.random();
			if (rand < 0.3) {
				col = 0xff0000;
			} else if (rand < 0.6) {
				col = 0xffff00;
			} else {
				col = 0xffffff;
			}

			// Create mesh with selected colour and add to scene
			const material = new THREE.MeshBasicMaterial({ color: col });
			const particle = new THREE.Mesh(geometry, material);

			particle.position.x = (Math.random() - 0.5) * 500;
			particle.position.y = -10000;
			particle.position.z = -2500 + Math.random() * 3000;
			particle.name = "Rear Particle";

			scene.add(particle);
			this.particles[i] = particle;
		}
	};

	/**
	 * Animates the rear particles.
	 */
	this.rearParticles = function () {
		for (let i = 0; i < this.particles.length; i++) {
			// Move the particle a random amount in z axis towards camera
			this.particles[i].position.z += Math.random() * this.car_speed;
			if (this.car_mesh != undefined && this.particles[i].position.z > -250) {
				// Move back to random x position when out of view
				var distance;
				if (Math.random() < 0.5) {
					distance = 100 + Math.random() * 125;
				} else {
					distance = -100 - Math.random() * 125;
				}

				// Scale the position to match car rotation
				var height_increase = 50;
				this.particles[i].position.x =
					this.car_mesh.position.x -
					height_increase * Math.sin(Math.PI - this.car_mesh.rotation.z) +
					distance * Math.cos(this.car_mesh.rotation.z);
				this.particles[i].position.y =
					this.car_mesh.position.y -
					height_increase * Math.cos(Math.PI - this.car_mesh.rotation.z) +
					distance * Math.sin(this.car_mesh.rotation.z);
				this.particles[i].position.z = this.car_mesh.position.z + 350;
			}
		}
	};

	/**
	 * Moves the car upwards.
	 */
	this.moveUp = function () {
		if (!this.height_change && this.car_mesh.position.y < 950) {
			this.height_change = true;
			this.start_pos_y = this.car_mesh.position.y;
			this.target_pos_y = this.car_mesh.position.y + this.height_sep;

			this.current_row = 1;

			return true;
		}
		return false;
	};

	/**
	 * Moves the car upwards.
	 */
	this.moveTo = function (target_y) {
		if (!this.height_change) {
			this.height_change = true;
			this.start_pos_y = this.car_mesh.position.y;
			this.target_pos_y = target_y;

			this.current_row = 0;

			return true;
		}
		return false;
	};

	/**
	 * Moves the car down.
	 */
	this.moveDown = function () {
		if (!this.height_change && this.car_mesh.position.y > 550) {
			this.height_change = true;
			this.start_pos_y = this.car_mesh.position.y;
			this.target_pos_y = this.car_mesh.position.y - this.height_sep;

			this.current_row = 0;

			return true;
		}
		return false;
	};

	/**
	 * Moves the car right.
	 */
	this.moveRight = function () {
		if (!this.lane_change && this.car_center_offset != this.lane_sep) {
			// Normal lane change
			this.lane_change = true;
			this.start_pos_x = this.car_center_offset;
			this.target_pos_x = this.start_pos_x + this.lane_sep;

			this.current_col++;

			return true;
		} else if (
			this.lane_change &&
			this.target_pos_x > this.start_pos_x &&
			!this.double &&
			this.target_pos_x != this.lane_sep &&
			this.flip_iters < this.lane_change_iters / 2
		) {
			// Double lane change
			this.target_pos_x += this.lane_sep;
			this.start_pos_x = this.car_mesh.position.x;
			this.double = true;
			this.move_iters = 0;

			this.current_col++;
		}
		return false;
	};

	/**
	 * Moves the car left.
	 */
	this.moveLeft = function () {
		if (!this.lane_change && this.car_center_offset != -this.lane_sep) {
			// Normal lane change
			this.lane_change = true;
			this.start_pos_x = this.car_center_offset;
			this.target_pos_x = this.start_pos_x - this.lane_sep;

			this.current_col--;

			return true;
		} else if (
			this.lane_change &&
			this.target_pos_x < this.start_pos_x &&
			!this.double &&
			this.target_pos_x != -this.lane_sep &&
			this.flip_iters < this.lane_change_iters / 2
		) {
			// Double lane change
			this.target_pos_x -= this.lane_sep;
			this.start_pos_x = this.car_mesh.position.x;
			this.double = true;
			this.move_iters = 0;

			this.current_col--;
		}

		return false;
	};

	/**
	 * Detects collisions between the car and obstacles using Raycasters.
	 */
	this.collisionDetection = function (obstacles) {
		if (this.car_hitbox != undefined) {
			this.updateHitBox(); // Move the cars hit box to get recent position

			var originPoint = this.car_hitbox.position.clone();
			const globalVector = new THREE.Vector3();

			for (
				var vertexIndex = 0;
				vertexIndex < this.car_hitbox.geometry.attributes.position.count;
				vertexIndex++
			) {
				// For ray direction
				globalVector.fromBufferAttribute(
					this.car_hitbox.geometry.attributes.position,
					vertexIndex
				);
				globalVector.applyMatrix4(this.car_hitbox.matrixWorld);

				var directionVector = globalVector.sub(this.car_hitbox.position);

				// Create the raycast
				var ray = new THREE.Raycaster(
					originPoint,
					directionVector.clone().normalize()
				);

				// See if the ray intersects an obstacle
				var collisionResults = ray.intersectObjects(obstacles.obstacles);
				if (
					collisionResults.length > 0 &&
					collisionResults[0].distance < directionVector.length()
				) {
					// If not in comet mode, hide the hit object
					if (
						!(
							(obstacles.getMode() == 2 && obstacles.getModeBegan()) ||
							(!obstacles.getModeBegan() && obstacles.getMode() == 2)
						)
					)
						collisionResults[0].object.visible = false;

					// If game is not over, initialise game ending
					return true;
				}
			}
			return false;
		}
	};

	/**
	 * Returns the current car position.
	 */
	this.getPosition = function () {
		return [this.current_col, this.current_row];
	};

	/**
	 * Updates the position of the car hit box by simply setting
	 * rotation and position to the cars position and rotation.
	 */
	this.updateHitBox = function () {
		if (this.car_hitbox != undefined && this.car_mesh != undefined) {
			// Update position
			this.car_hitbox.position.x = this.car_mesh.position.x;
			this.car_hitbox.position.y = this.car_mesh.position.y;
			this.car_hitbox.position.z = this.car_mesh.position.z;

			// Update rotation
			this.car_hitbox.rotation.x = this.car_mesh.rotation.x;
			this.car_hitbox.rotation.y = this.car_mesh.rotation.y;
			this.car_hitbox.rotation.z = this.car_mesh.rotation.z;
		}
	};

	/**
	 * Get a random number between 0 and 1.
	 * @returns Random float between 0 and 1.
	 */
	this.random = function () {
		const x = Math.sin(this.seed++) * 10000;
		return x - Math.floor(x);
	};
}
