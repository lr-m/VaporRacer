import * as THREE from "../three.js-dev/build/three.module.js";

export default function Obstacles() {
  // Obstacles/scenery
  this.obstacles = [];
  this.obstacle_rotations = [];

  this.mode = 0;
  this.last_mode = 0;
  this.mode_began = true;
  this.planet_count = 5;

  // For comet trail
  this.comet_particles = [];
  this.comet_count = 5;

  this.initial_obstacle_count = 10;

  /**
   * Initialises the asteroid obstacles.
   */
  this.initialiseAsteroids = function (scene, asteroid_mesh) {
    this.mode_began = true;

    for (let i = 0; i < this.initial_obstacle_count; i++) {
      // Create a clone of the mesh and scale randomly
      const obstacle = asteroid_mesh.clone();
      obstacle.scale.set(
        obstacle.scale.x * (Math.random() + 0.5),
        obstacle.scale.y * (Math.random() + 0.5),
        obstacle.scale.z * (Math.random() + 0.5)
      );

      // Set the position to one of the 6 available positions
      obstacle.position.x = -1000 + 1000 * Math.round(3 * Math.random() - 0.5);
      obstacle.position.y = 375 + Math.round(Math.random()) * 1125;
      obstacle.position.z =
        -50000 -
        2 * i * (50000 / this.initial_obstacle_count) -
        Math.random() * 1000;
      obstacle.name = "Asteroid";

      scene.add(obstacle);
      this.obstacles[i] = obstacle;

      // Give it a random rotation
      this.obstacle_rotations[i] = [
        Math.random() - 0.5,
        Math.round(Math.random() * 4 - 0.5),
      ];
    }

    this.initial_obstacle_count += 2;

    return true;
  };

  /**
   * Initialises the comet trail level.
   */
  this.initialiseCometTrail = function (scene, asteroid_mesh) {
    this.mode_began = true;

    for (let i = 0; i < this.comet_count; i++) {
      // Create comet
      const obstacle = asteroid_mesh.clone();
      obstacle.scale.set(
        obstacle.scale.x * (Math.random() + 0.75),
        obstacle.scale.y * (Math.random() + 0.75),
        obstacle.scale.z * (Math.random() + 0.75)
      );
      obstacle.position.x = -1000 + 1000 * Math.round(3 * Math.random() - 0.5);
      obstacle.position.y = 375 + Math.round(Math.random()) * 1125;
      obstacle.position.z =
        -50000 - i * (50000 / this.comet_count) - Math.random() * 1000;
      obstacle.name = "Comet Trail";

      scene.add(obstacle);
      this.obstacles[i] = obstacle;
      this.obstacle_rotations[i] = [
        Math.random() - 0.5,
        Math.round(Math.random() * 4 - 0.5),
      ];

      // Create comet particles that trail behind comet
      this.comet_particles[i] = [];
      for (let j = 0; j < 10; j++) {
        const geometry = new THREE.CircleGeometry(200, 16);

        var col = 0x40e0d0;

        const material = new THREE.MeshBasicMaterial({ color: col });
        const particle = new THREE.Mesh(geometry, material);
        particle.position.x = this.obstacles[i].position.x;
        particle.position.y = this.obstacles[i].position.y;
        particle.position.z =
          this.obstacles[i].position.z - 500 - Math.random() * 7500;
        scene.add(particle);
        this.comet_particles[i][j] = particle;
      }
    }

    if (Math.random() < 0.5) this.comet_count++;
  };

  /**
   * Initialises the solar system level.
   */
  this.initialisePlanetMode = function (scene, planetMeshes) {
    this.mode_began = true;

    // Initialise planets
    for (let i = 0; i < this.planet_count; i++) {
      var mesh =
        planetMeshes[
          Math.round(Math.random() * planetMeshes.length - 0.5)
        ].clone();

      if (mesh.position.x != 0)
        mesh.position.x = -500 + 1000 * Math.round(2 * Math.random() - 0.5);

      mesh.position.y = 1000;
      mesh.position.z = -50000 - (i * 50000) / this.planet_count;

      // Give the mesh either left or right leaning rotation
      var rotMatrix = new THREE.Matrix4();
      var orientation = -1;
      if (Math.random() < 0.5) orientation = 1;

      // Create the rotation axis and apply to the mesh
      rotMatrix.makeRotationAxis(
        new THREE.Vector4(0, 0, 1).normalize(),
        (orientation * Math.PI) / 5
      );

      mesh.matrix.multiply(rotMatrix);

      mesh.rotation.setFromRotationMatrix(mesh.matrix);

      scene.add(mesh);

      this.obstacles[this.obstacles.length] = mesh;

      // Give the mesh a random rotation speed
      this.obstacle_rotations[this.obstacle_rotations.length] = [
        Math.random() - 0.5,
        1,
      ];
    }
  };

  /**
   * Moves obstacles forwards.
   */
  this.move = function (car_speed, scene, asteroid_mesh, planetMeshes) {
    // Move all the objects forward
    for (let i = 0; i < this.obstacles.length; i++) {
      // If comet mode, move quicker than other modes
      if (
        (this.mode == 2 && this.mode_began) ||
        (!this.mode_began && this.last_mode == 2)
      ) {
        if (car_speed > 0) {
          this.obstacles[i].position.z += 2.5 * car_speed;
        } else {
          this.obstacles[i].position.z += 250;
        }

        // Move and update the particles trailing the comet
        if (this.comet_particles[i] != undefined) {
          for (let j = 0; j < this.comet_particles[i].length; j++) {
            this.comet_particles[i][j].position.z += car_speed;
            if (
              this.comet_particles[i][j].position.z <
                this.obstacles[i].position.z - 7500 ||
              this.comet_particles[i][j].position.z >
                this.obstacles[i].position.z
            ) {
              this.comet_particles[i][j].position.z =
                this.obstacles[i].position.z;
            }

            this.comet_particles[i][j].scale.x =
              1 -
              (this.obstacles[i].position.z -
                this.comet_particles[i][j].position.z) /
                7500;
            this.comet_particles[i][j].scale.y =
              1 -
              (this.obstacles[i].position.z -
                this.comet_particles[i][j].position.z) /
                7500;
          }
        }
      } else {
        // Otherwise, just move the object at the speed of the car
        this.obstacles[i].position.z += car_speed;
      }

      // Reset objects when they are out of view, also clear obstacles when next mode
      if (this.obstacles[i].position.z > 5000) {
        if ((this.mode == 0 || this.mode == 2) && this.mode_began) {
          this.obstacles[i].position.y = 375 + Math.round(Math.random()) * 1125;
          this.obstacles[i].position.x =
            -1000 + 1000 * Math.round(3 * Math.random() - 0.5);
          this.obstacles[i].position.z -= 50000 + Math.random() * 5000;

          if (this.mode == 2) {
            for (let j = 0; j < this.comet_particles[i].length; j++) {
              this.comet_particles[i][j].position.x =
                this.obstacles[i].position.x;
              this.comet_particles[i][j].position.y =
                this.obstacles[i].position.y;
              this.comet_particles[i][j].position.z =
                this.obstacles[i].position.z - 500 - Math.random() * 7500;
            }
          }
        } else if (this.mode == 1 && this.mode_began) {
          if (this.obstacles[i].position.x != 0)
            this.obstacles[i].position.x =
              -500 + 1000 * Math.round(2 * Math.random() - 0.5);

          this.obstacles[i].position.y = 1000;
          this.obstacles[i].position.z -= 50000;
        } else if (!this.mode_began) {
          // Clear obstacles
          scene.remove(this.obstacles[i]);
          this.obstacles.splice(i, 1);
          this.obstacle_rotations.splice(i, 1);

          if (this.comet_particles[i] != undefined) {
            for (let j = 0; j < this.comet_particles[i].length; j++)
              scene.remove(this.comet_particles[i][j]);

            this.comet_particles.splice(i, 1);
          }
        }
      }
    }

    this.rotateObjects();

    // If objects cleared, initialise the objects for the new mode
    if (this.obstacles.length == 0 && !this.mode_began) {
      if (this.mode == 2) this.initialiseCometTrail(scene, asteroid_mesh);

      if (this.mode == 1) this.initialisePlanetMode(scene, planetMeshes);

      if (this.mode == 0) this.initialiseAsteroids(scene, asteroid_mesh);
    }
  };

  /**
   * Moves obstacles backwards in the z axis so that they are out of view.
   */
  this.moveOutOfView = function () {
    // Moves all the obstacles out of view
    for (let i = 0; i < this.obstacles.length; i++) {
      this.obstacles[i].position.z -= 55000;

      // Move and update the particles trailing the comet
      if (this.comet_particles[i] != undefined) {
        for (let j = 0; j < this.comet_particles[i].length; j++)
          this.comet_particles[i][j].position.z -= 55000;
      }
    }
  };

  /**
   * Rotates the obstacles.
   */
  this.rotateObjects = function () {
    // Rotate and reset objects when they pass
    for (let i = 0; i < this.obstacles.length; i++) {
      // Rotate objects
      if (
        ((this.mode == 0 || this.mode == 2) && this.mode_began) ||
        ((this.mode == 1 || this.mode == 2) && !this.mode_began)
      ) {
        if (this.obstacle_rotations[i][1] == 0) {
          this.obstacles[i].rotation.x += this.obstacle_rotations[i][0] / 10;
        } else if (this.obstacle_rotations[i][1] == 1) {
          this.obstacles[i].rotation.y += this.obstacle_rotations[i][0] / 10;
        } else if (this.obstacle_rotations[i][1] == 2) {
          this.obstacles[i].rotation.z += this.obstacle_rotations[i][0] / 10;
        }
      } else if (
        (this.mode == 1 && this.mode_began) ||
        (this.last_mode == 1 && this.mode == 0 && !this.mode_began)
      ) {
        // If in planet mode, rotate around a non-normal axis
        var axis = new THREE.Vector3(0, 1, 0);
        this.obstacles[i].rotateOnAxis(
          axis.normalize(),
          this.obstacle_rotations[i][0] / 10
        );
      }
    }
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
   * Resets the obstacles for the next round.
   */
  this.reset = function (scene) {
    // Clear existing objects from the scene
    this.clearListFromScene(this.obstacles, scene);

    for (let i = 0; i < this.comet_particles.length; i++)
      this.clearListFromScene(this.comet_particles[i], scene);

    // Obstacles/scenery
    this.particles = [];
    this.obstacles = [];

    this.obstacle_rotations = [];

    this.mode = 0;
    this.mode_began = true;

    // For comet trail
    this.comet_particles = [];
    this.last_mode = 0;

    this.initial_obstacle_count = 16;
    this.comet_count = 5;
  };

  /**
   * Returns int identifying the current level.
   */
  this.getMode = function () {
    return this.mode;
  };

  /**
   * Returns int identifying the previous level.
   */
  this.getLastMode = function () {
    return this.last_mode;
  };

  /**
   * Returns boolean indicating if last mode has completed and new mode
   * has begun.
   */
  this.getModeBegan = function () {
    return this.mode_began;
  };

  /**
   * Returns level summary for the dash.
   * @returns Current status.
   */
  this.getCurrentStatus = function () {
    if (this.mode == 0) {
      return "ASTEROID FIELD";
    } else if (this.mode == 1) {
      return "SOLAR SYSTEM";
    } else if (this.mode == 2) {
      return "COMET TRAIL";
    }
  };

  /**
   * Check for level changes based on the time variable.
   */
  this.modeChanges = function (last_time, hyperdrive) {
    // Exit challenge level after 20 seconds
    if (
      this.mode != 0 &&
      Math.round(new Date().getTime() / 1000) >= last_time + 20
    ) {
      // Change modes
      this.last_mode = this.mode;
      if (this.mode == 1 && this.mode_began) {
        this.mode = 0;
        this.mode_began = false;
      } else if (this.mode == 2 && this.mode_began) {
        this.mode = 0;
        this.mode_began = false;
      }
    }

    // Change from default mode after 40 seconds
    if (Math.round(new Date().getTime() / 1000) >= last_time + 40) {
      // Change modes to random challenge mode
      this.mode = Math.round(Math.random() * 2 + 0.5);
      this.mode_began = false;
      this.last_mode = 0;

      if (hyperdrive.getCurrentCharge() < hyperdrive.getFullCharge())
        hyperdrive.incrementCharge();

      return Math.round(new Date().getTime() / 1000);
    }
    return last_time;
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
