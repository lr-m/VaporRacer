import * as THREE from "../three.js-dev/build/three.module.js";
import { ShaderPass } from "../three.js-dev/examples/jsm/postprocessing/ShaderPass.js";

export default function Hyperdrive() {
	// For hyperdrive
	this.active = false;
	this.hyperdrive_frames = 300;
	this.hyperdrive_current_frame = 0;
	this.start_speed;
	this.hyperdrive_particles = [];

	this.current_hyperdrive_charge = 0;
	this.full_hyperdrive_charge = 2;

	this.particle_count = 100;

	this.postprocessingEnabled = false;

	/**
	 * Get a random number between 0 and 1.
	 * @returns Random float between 0 and 1.
	 */
	this.random = function () {
		const x = Math.sin(this.seed++) * 10000;
		return x - Math.floor(x);
	};

	/**
	 * Turns on/off hyperdrive postprocessing effect.
	 */
	this.togglePostprocessing = function(){
		this.postprocessingEnabled = !this.postprocessingEnabled;
	}

	/**
	 * Indicates if the hyperdrive is active.
	 * @returns Active indicator boolean.
	 */
	this.isActive = function () {
		return this.active;
	};

	/**
	 * Set the active boolean.
	 * @param {boolean} active Boolean to set to active.
	 */
	this.setActive = function (active) {
		this.active = active;
	};

	/**
	 * Returns amount needed for full charge.
	 * @returns Amount needed for full charge.
	 */
	this.getFullCharge = function () {
		return this.full_hyperdrive_charge;
	};

	/**
	 * Returns current chrarge.
	 * @returns Value of the current charge.
	 */
	this.getCurrentCharge = function () {
		return this.current_hyperdrive_charge;
	};

	/**
	 * Sets the charge to 0.
	 */
	this.clearCharge = function () {
		this.current_hyperdrive_charge = 0;
	};

	/**
	 * Increments the charge value by 1.
	 */
	this.incrementCharge = function () {
		this.current_hyperdrive_charge++;
	};

	/**
	 * Initialises the particles used to give the wormhole effect during
	 * the hyperdrive.
	 */
	this.initialise = function (scene) {
		// Overdrive particles
		for (let i = 0; i < this.particle_count; i++) {
			const boxWidth = 5,
				boxHeight = 50,
				boxDepth = 1000;
			const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

			var col = 0xffffff;
			var rand = Math.random();
			const material = new THREE.MeshBasicMaterial({ color: col });
			const slab = new THREE.Mesh(geometry, material);

			slab.name = "hyperdrive";
			scene.add(slab);
			slab.visible = false;
			this.hyperdrive_particles[i] = slab;
		}

		// Initialise color change shader/postprocessing
		const colorShader = {
			uniforms: {
				tDiffuse: { value: null },
				colour: { value: new THREE.Color(0xff28ffff) },
			},
			vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1);
            }
            `,
			fragmentShader: `
            uniform vec3 colour;
            uniform sampler2D tDiffuse;
            varying vec2 vUv;

            void main() {
                // Get previous pass colours
                vec4 previousPassColour = texture2D(tDiffuse, vUv);

                // Set the new colour by multiplying old with desired colour
                gl_FragColor = vec4(
                    previousPassColour.rgb * colour,
                    previousPassColour.a);
            }
            `,
		};

		this.colorPass = new ShaderPass(colorShader);
		this.colorPass.renderToScreen = true;
	};

	/**
	 * Moves the hyperdrive particles based on a random angle.
	 */
	this.randomiseParticles = function (car_position) {
		// Overdrive particles
		for (let i = 0; i < this.particle_count; i++) {
			var rand_angle = Math.random() * Math.PI * 2;
			this.hyperdrive_particles[i].position.x =
				car_position.x + Math.cos(rand_angle) * 550;
			this.hyperdrive_particles[i].position.y =
				car_position.y + Math.sin(rand_angle) * 550;
			this.hyperdrive_particles[i].rotation.z = rand_angle;
			this.hyperdrive_particles[i].position.z =
				car_position.z - 10000 - Math.random() * 50000;
		}
	};

	/**
	 * Function that starts the hyperdrive.
	 */
	this.start = function (composer, car_position, start_speed) {
		this.active = true;
		this.hyperdrive_current_frame = 0;

		this.start_speed = start_speed;

		// Makes all of the hyperdrive particles visible
		for (let i = 0; i < this.hyperdrive_particles.length; i++)
			this.hyperdrive_particles[i].visible = true;

		// Adds the color postprocessing to the composer
		if (this.postprocessingEnabled)
			composer.addPass(this.colorPass);

		this.randomiseParticles(car_position);
	};

	/**
	 * Ends the hyperdrive sequence, resets everything to state before
	 * hyperdrive was started.
	 * @return The speed of the car when hyperdrive was started.
	 */
	this.end = function (composer) {
		this.active = false;
		this.current_hyperdrive_charge = 0;

		// Make the hyperdrive particles invisible
		for (let i = 0; i < this.hyperdrive_particles.length; i++)
			this.hyperdrive_particles[i].visible = false;

		// Remove the colour pass from the composer
		if (this.postprocessingEnabled)
			composer.removePass(this.colorPass);

		return this.start_speed;
	};

	/**
	 * Iterates the hyperdrive sequence, moving the car, camera and
	 * particles.
	 */
	this.iterate = function (car_mesh, camera, car_speed, composer) {
		this.hyperdrive_current_frame++;

		// Check for end of hyperdrive
		if (this.hyperdrive_current_frame >= this.hyperdrive_frames)
			return this.end(composer);

		// Rotate car and camera
		car_mesh.rotation.z += (4 * Math.PI) / this.hyperdrive_frames;
		camera.rotation.z = car_mesh.rotation.z;

		// Move and update the hyperdrive particles
		for (let i = 0; i < this.hyperdrive_particles.length; i++) {
			this.hyperdrive_particles[i].position.z += car_speed / 3;
			if (this.hyperdrive_particles[i].position.z > 1000) {
				var rand_angle = Math.random() * Math.PI * 2;
				this.hyperdrive_particles[i].position.z -= 50000 + Math.random() * 5000;
				this.hyperdrive_particles[i].position.x =
					car_mesh.position.x + Math.cos(rand_angle) * 550;
				this.hyperdrive_particles[i].position.y =
					car_mesh.position.y + Math.sin(rand_angle) * 550;
				this.hyperdrive_particles[i].rotation.z = rand_angle;
			} else {
				var new_angle =
					this.hyperdrive_particles[i].rotation.z +
					this.hyperdrive_particles[i].position.z / 100000;
				this.hyperdrive_particles[i].position.x =
					car_mesh.position.x + Math.cos(new_angle) * 550;
				this.hyperdrive_particles[i].position.y =
					car_mesh.position.y + Math.sin(new_angle) * 550;
				this.hyperdrive_particles[i].rotation.z = new_angle;
			}
		}

		return 2500;
	};
}
