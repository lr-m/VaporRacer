import * as THREE from "../three.js/build/three.module.js";
import { ImprovedNoise } from "../three.js/Utilities/ImprovedNoise.js";

export default function Scenery() {
  this.buildings = [];
  this.building_tops = [];

  this.seed = Math.PI / 4;

  this.iters = 0;
  this.reset_second_floor_flag = true;
  this.plane_x = 15000;
  this.plane_y = 75000;
  this.init_offset = 5000;

  this.worldWidth = 256;
  this.worldDepth = 256;

  this.topHeight = 100;

  /**
   * Initialises the textures and raycaster/mouse used by the menu.
   */
  this.initialise = function (scene, camera) {
    // Initialise perlin noise for map generation
    this.z = this.random() * 100;

    this.perlin = new ImprovedNoise();

    this.initialiseFloors(scene, this.init_offset);

    this.initialiseBuildings(scene, 0);

    this.initialiseLighting(scene, camera);

    this.initialiseSun(scene);
  };

  /**
   * Initialise the buildings seen along the sides of the road.
   */
  this.initialiseBuildings = function (scene, y_pos) {
    var positions = [11000, -11000];

    for (let j = 0; j < positions.length; j++) {
      var buildingsWidth = 0;

      // Fill the entire depth of view
      while (buildingsWidth < 50000) {
        const boxDepth = 5000 + Math.random(2500),
          boxHeight = 6000 + 5000 * Math.random(),
          boxWidth = 5000;

        buildingsWidth += boxDepth;

        var rand = 50 + Math.round(Math.random() * 150);

        const material = new THREE.MeshStandardMaterial({
          color: parseInt(this.rgbToHex(rand, 0, rand)),
          metalness: 0.5,
          roughness: 0.5,
        });

        var col;

        if (Math.random() < 0.5) {
          col = parseInt(this.rgbToHex(38, 247, 253));
        } else {
          col = parseInt(this.rgbToHex(0, 255, 0));
        }

        const top_material = new THREE.MeshStandardMaterial({
          color: col,
          emissive: col,
        });

        // Randomly select between box and cylinder
        var geometry;
        var top_geometry;
        if (Math.random() < 0.5) {
          geometry = new THREE.CylinderGeometry(
            boxDepth / 2,
            boxDepth / 2,
            boxHeight,
            32
          );

          top_geometry = new THREE.CylinderGeometry(
            boxDepth / 2,
            boxDepth / 2,
            this.topHeight,
            32
          );
        } else {
          geometry = new THREE.BoxGeometry(
            boxWidth,
            boxHeight,
            boxDepth,
            1,
            1,
            1
          );

          top_geometry = new THREE.BoxGeometry(
            boxWidth,
            this.topHeight,
            boxDepth,
            1,
            1,
            1
          );
        }

        // Create the building mesh
        var building = new THREE.Mesh(geometry, material);
        building.position.x = positions[j];
        building.position.y = y_pos + boxHeight / 2 - 1000;
        building.position.z = -buildingsWidth - boxDepth;
        building.name = "Building Mesh";

        // Create the building top
        var top = new THREE.Mesh(top_geometry, top_material);
        top.position.x = positions[j];
        top.position.y = y_pos + boxHeight - 1000 + this.topHeight / 2;
        top.position.z = -buildingsWidth - boxDepth;
        top.name = "Building Top Mesh";

        scene.add(top);
        scene.add(building);

        this.building_tops[this.building_tops.length] = top;
        this.buildings[this.buildings.length] = building;
      }
    }
  };

  /**
   * Initialise the sun.
   */
  this.initialiseSun = function (scene) {
    const sun_shape = new THREE.Shape();

    sun_shape.absarc(0, 0, 8000);

    const segments = 100;
    const geometry = new THREE.ShapeGeometry(sun_shape, segments / 2);

    // Generate the shader material used for the suns gradient
    const material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1);
        }
        `,
      fragmentShader: `
        varying vec2 vUv;

        void main() {
          float st = abs(vUv.y / 7000.0);

          vec3 color1 = vec3(1.0, 0.65, 0);
          vec3 color2 = vec3(1.0, 0.0, 0.65);

          float mixValue = st;
          vec3 gradient = mix(color1,color2,mixValue);

          gl_FragColor = vec4(gradient, 1.);
        }
        `,
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Set sun position (far away from player to reduce parallax)
    mesh.position.y = 0;
    mesh.position.z = -49500;

    scene.add(mesh);
  };

  /**
   * Moves the buildings along at the same speed as the terrain,
   * resetting if they are no longer in view.
   */
  this.move = function (scene, speed) {
    for (let i = 0; i < this.buildings.length; i++) {
      if (this.buildings[i] != undefined) {
        this.buildings[i].position.z += speed;
        this.building_tops[i].position.z += speed;

        if (this.buildings[i].position.z > -250) {
          this.buildings[i].position.z -= 50000;
          this.building_tops[i].position.z -= 50000;
        }
      }
    }

    this.moveFloors(scene, speed);
  };

  /**
   * Utility function that converts RGB values to hex.
   */
  this.rgbToHex = function (r, g, b) {
    return "0x" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  /**
   * Initialises the floor terrain panels.
   */
  this.initialiseFloors = function (scene, z_offset) {
    // For floor mesh 1
    var data = this.generateHeight(this.worldWidth, this.worldDepth);
    var geometry = new THREE.PlaneGeometry(
      this.plane_x,
      this.plane_y,
      this.worldWidth - 1,
      this.worldDepth - 1
    );
    geometry.rotateX(-Math.PI / 2);

    // Amplify the generated height y values, and move down by z offset
    var vertices = geometry.attributes.position.array;
    for (let i = 0, j = 0, l = vertices.length; i < l; i++, j += 3) {
      vertices[j + 1] = data[i] * 10;
      vertices[j + 2] -= z_offset;
    }

    // Generate the first floor panel texture and mesh
    this.floor_texture_1 = new THREE.CanvasTexture(
      this.generateTexture(data, this.worldWidth, this.worldDepth, false)
    );
    this.floor_texture_1.wrapS = THREE.ClampToEdgeWrapping;
    this.floor_texture_1.wrapT = THREE.ClampToEdgeWrapping;

    this.floor_mesh_1 = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ map: this.floor_texture_1 })
    );
    this.floor_mesh_1.name = "Floor Mesh 1";
    scene.add(this.floor_mesh_1);

    // For floor mesh 2
    data = this.generateHeight(this.worldWidth, this.worldDepth);
    geometry = new THREE.PlaneGeometry(
      this.plane_x,
      this.plane_y,
      this.worldWidth - 1,
      this.worldDepth - 1
    );
    geometry.rotateX(-Math.PI / 2);

    vertices = geometry.attributes.position.array;
    for (let i = 0, j = 0, l = vertices.length; i < l; i++, j += 3) {
      vertices[j + 1] = data[i] * 10;
      vertices[j + 2] -= this.plane_y + z_offset;
    }

    this.floor_texture_2 = new THREE.CanvasTexture(
      this.generateTexture(data, this.worldWidth, this.worldDepth, true)
    );
    this.floor_texture_2.wrapS = THREE.ClampToEdgeWrapping;
    this.floor_texture_2.wrapT = THREE.ClampToEdgeWrapping;

    this.floor_mesh_2 = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ map: this.floor_texture_2 })
    );
    this.floor_mesh_2.name = "Floor Mesh 2";
    scene.add(this.floor_mesh_2);
  };

  /**
   * Moves the floor terrain panels backwards when behind camera.
   */
  this.updateFloor = function (scene, floor, z_offset) {
    const data = this.generateHeight(this.worldWidth, this.worldDepth);
    const geometry = new THREE.PlaneGeometry(
      this.plane_x,
      this.plane_y,
      this.worldWidth - 1,
      this.worldDepth - 1
    );
    geometry.rotateX(-Math.PI / 2);

    const vertices = geometry.attributes.position.array;

    for (let i = 0, j = 0, l = vertices.length; i < l; i++, j += 3) {
      vertices[j + 1] = data[i] * 10;
      vertices[j + 2] -= this.plane_y + z_offset;
    }

    if (floor == 1) {
      scene.remove(this.floor_mesh_1);

      this.floor_mesh_1 = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({ map: this.floor_texture_1 })
      );
      this.floor_mesh_1.position.z = this.floor_mesh_2.position.z - 75000;

      scene.add(this.floor_mesh_1);
    } else if (floor == 2) {
      scene.remove(this.floor_mesh_2);

      this.floor_mesh_2 = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({ map: this.floor_texture_2 })
      );
      this.floor_mesh_2.position.z = this.floor_mesh_1.position.z - 75000;

      scene.add(this.floor_mesh_2);
    }
  };

  /**
   * Generates the heights used by the floor panels.
   */
  this.generateHeight = function (width, height) {
    const size = width * height,
      data = new Uint8Array(size);
    let quality = 50;

    for (let i = 0; i < size; i++) {
      const x = i % width,
        y = width - ~~(i / width);

      // Used to create flat area in middle and flat edges
      var influence =
        Math.abs(width / 4 - Math.abs(Math.abs(x - width / 2) - width / 4)) /
        100;
      var close_to_centre = (Math.abs(x - width / 2) - 25) / 4;

      // Used perlin noise to get value if not in the flat area
      if (Math.abs(x - width / 2) > 25) {
        data[i] +=
          influence *
          close_to_centre *
          Math.abs(
            this.perlin.noise(
              x / quality,
              ((width - 1) * this.iters + y) / quality,
              this.z
            ) * quality
          );
      }
    }

    this.iters++;
    return data;
  };

  /**
   * Generates the textures used by the floor panels.
   */
  this.generateTexture = function (data, width, height, reverse) {
    let context, image, imageData;

    const vector3 = new THREE.Vector3(0, 0, 0);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    context = canvas.getContext("2d");
    context.fillStyle = "#000";
    context.fillRect(0, 0, width, height);

    image = context.getImageData(0, 0, canvas.width, canvas.height);
    imageData = image.data;

    for (let i = 0, j = 0, l = imageData.length; i < l; i += 4, j++) {
      vector3.x = data[j - 2] - data[j + 2];
      vector3.y = 2;
      vector3.z = data[j - width * 2] - data[j + width * 2];
      vector3.normalize();

      const x = (i / 4) % width,
        y = ~~(i / 4 / width);

      // Colours to cycle between
      var col1 = [0, 255, 0];
      var col2 = [1, 205, 254];

      // Add the lines to the texture
      if (x % 8 == 0 || y % 4 == 0) {
        // Set rgb values of lines with scale function
        if (!reverse) {
          imageData[i] = this.scale(y, 0, width, col1[0], col2[0]);
          imageData[i + 1] = this.scale(y, 0, width, col1[1], col2[1]);
          imageData[i + 2] = this.scale(y, 0, width, col1[2], col2[2]);
          imageData[i + 3] = 45;
        } else {
          imageData[i] = this.scale(y, 0, width, col2[0], col1[0]);
          imageData[i + 1] = this.scale(y, 0, width, col2[1], col1[1]);
          imageData[i + 2] = this.scale(y, 0, width, col2[2], col1[2]);
          imageData[i + 3] = 45;
        }
      } else if (Math.abs(x - width / 2) > 23) {
        // Set rgb values of area with scale function
        imageData[i] = this.scale(
          Math.abs(x - width / 2),
          0,
          width / 2,
          0,
          125
        );
        imageData[i + 1] = 0;
        imageData[i + 2] = this.scale(
          Math.abs(x - width / 2),
          0,
          width / 2,
          0,
          125
        );
      }
    }

    context.putImageData(image, 0, 0);

    // Scaled 4x
    const canvasScaled = document.createElement("canvas");
    canvasScaled.width = width * 4;
    canvasScaled.height = height * 4;

    context = canvasScaled.getContext("2d");
    context.scale(4, 4);
    context.drawImage(canvas, 0, 0);

    image = context.getImageData(0, 0, canvasScaled.width, canvasScaled.height);
    imageData = image.data;

    for (let i = 0, l = imageData.length; i < l; i += 4) {
      const v = ~~(Math.random() * 5);

      imageData[i] += v;
      imageData[i + 1] += v;
      imageData[i + 2] += v;
    }

    context.putImageData(image, 0, 0);

    return canvasScaled;
  };

  /**
   * Function that cycles the floor panels for smooth terrain generation.
   */
  this.moveFloors = function (scene, speed) {
    // Increment floor positions
    this.floor_mesh_1.position.z += speed;
    this.floor_mesh_2.position.z += speed;

    // Reset the floors if needed
    if (this.floor_mesh_1.position.z > 2 * this.plane_y) {
      this.updateFloor(scene, 1, this.init_offset);
    } else if (
      this.floor_mesh_2.position.z > this.plane_y &&
      this.reset_second_floor_flag
    ) {
      this.updateFloor(scene, 1, this.init_offset);
      this.reset_second_floor_flag = false;
    } else if (this.floor_mesh_2.position.z > 2 * this.plane_y) {
      this.updateFloor(scene, 2, this.init_offset);
    }
  };

  /**
   * Simple scaling function, maps values in a range to values in
   * a different range.
   */
  this.scale = function (number, inMin, inMax, outMin, outMax) {
    return ((number - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  };

  /**
   * Initialises the lighting used by the game, 3 sources of light,
   * 2 spotlights (car headlights and sun), and ambient light.
   */
  this.initialiseLighting = function (scene, camera) {
    // Add ambient light
    const color = 0xffffff;
    const intensity = 0.2;
    const light = new THREE.AmbientLight(color, intensity);
    scene.add(light);

    // Add sun spotlight
    var sunlight = new THREE.SpotLight(0xff9900);
    sunlight.intensity = 0.5;
    sunlight.position.set(
      camera.position.x,
      camera.position.y + 2500,
      camera.position.z - 50000
    );
    sunlight.target.position.set(0, camera.position.y, camera.position.z);
    scene.add(sunlight);
    scene.add(sunlight.target);

    // Add headlight spotlight
    var headlights = new THREE.SpotLight(0xffffff, 0.5);
    headlights.target.position.set(
      camera.position.x,
      camera.position.y + 1000,
      camera.position.z - 50000
    );
    headlights.position.set(0, camera.position.y, camera.position.z - 3100);
    scene.add(headlights);
    scene.add(headlights.target);
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
