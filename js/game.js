//COLORS
var Colors = {
    red: 0xf25346,
    white: 0xd8d0d1,
    brown: 0x59332e,
    brownDark: 0x23190f,
    pink: 0xF5986E,
    yellow: 0x68c3c0,
    blue: 0x6aa84f,

};

///////////////

// GAME VARIABLES
var game;
var deltaTime = 0;
var newTime = new Date().getTime();
var oldTime = new Date().getTime();
var ennemiesPool = [];
var projectilePool = [];
var projectilesInUse = [];
var particlesPool = [];
var particlesInUse = [];

const apiPath = 'ws://localhost:3080/connect_client'
var connection = null

function resetGame() {
    game = {
        speed: 0,
        initSpeed: .00035,
        baseSpeed: .0002,
        targetBaseSpeed: .00035,
        incrementSpeedByTime: .0000025,
        incrementSpeedByLevel: .000005,
        distanceForSpeedUpdate: 100,
        speedLastUpdate: 0,

        distance: 0,
        score: 0,
        ratioSpeedDistance: 50,
        energy: 100,
        ratioSpeedEnergy: 3,

        level: 1,
        levelLastUpdate: 0,
        distanceForLevelUpdate: 500,

        planeDefaultHeight: 100,
        planeAmpHeight: 80,
        planeAmpWidth: 75,
        planeMoveSensivity: 0.005,
        planeRotXSensivity: 0.0008,
        planeRotZSensivity: 0.0004,
        planeFallSpeed: .001,
        planeMinSpeed: 1.2,
        planeMaxSpeed: 1.6,
        planeSpeed: 0,
        planeCollisionDisplacementX: 0,
        planeCollisionSpeedX: 0,

        planeCollisionDisplacementY: 0,
        planeCollisionSpeedY: 0,

        seaRadius: 600,
        seaLength: 800,
        //seaRotationSpeed:0.006,
        wavesMinAmp: 5,
        wavesMaxAmp: 20,
        wavesMinSpeed: 0.001,
        wavesMaxSpeed: 0.003,

        cameraFarPos: 500,
        cameraNearPos: 150,
        cameraSensivity: 0.002,

        coinDistanceTolerance: 15,
        coinValue: 3,
        coinsSpeed: .5,
        coinLastSpawn: 0,
        distanceForCoinsSpawn: 100,

        ennemyDistanceTolerance: 10,
        ennemyValue: 20,
        ennemiesSpeed: .6,
        ennemyLastSpawn: 0,
        distanceForEnnemiesSpawn: 50,

        ennemyDistanceDetectProjectile: 250,
        ennemyDistanceDetectPlayer: 100,

        upgradeDistanceTolerance: 10,
        upgradeSpeed: .5,
        upgradeLastSpawn: 0,
        distanceForUpgradeSpawn: 500,

        maxProjectile: 1,

        status: "playing",

        pilot: "Pilot-000000"
    };
    fieldLevel.innerHTML = Math.floor(game.level);

    try {
        connection = new WebSocket(apiPath)

        connection.addEventListener('message', (event) => {
            msg = JSON.parse(event.data)
            if (msg["type"] == "code") {
                game.pilot = msg["code"]
                document.getElementById("code").innerHTML = `${game.pilot}`
                console.log("code: ", msg["code"])

                connection.send(JSON.stringify({
                    "content": `${game.pilot} has joined the race!`
                }))
            }

            if (msg["type"] == "msg") {
                console.log("msg: ", JSON.stringify(msg["data"]))
                let newLog = ''
                for (data of msg["data"]) {
                    var s = new Date(data["created_time"] * 1000).toLocaleTimeString("en-US")
                    newLog = newLog + `<div class="progress-unit">${s} ${data["pilot"]}: ${data["content"]}</div>`
                }

                document.getElementById("progress").innerHTML = newLog
            }

            if (msg["type"] == "rank") {
                console.log("ranking: ", JSON.stringify(msg["data"]))
                let newRank = ''
                for (data of msg["data"]) {
                    newRank = newRank + `<div class="ranking-unit">${data["pilot"]} - Score: ${data["score"]}</div>`
                }

                document.getElementById("ranking").innerHTML = newRank
            }
        })

        connection.addEventListener('error', (event) => {
            connection.close()
            connection = null
        })
    } catch(err) {}
}

function updateConnectionScore() {
    if (connection != null) {
        connection.send(JSON.stringify({
            "score": game.score
        }))
    }
}

function updateConnectionDead() {
    if (connection != null) {
        connection.send(JSON.stringify({
            "content": `${game.pilot} has fallen!`
        }))
        connection.send(JSON.stringify({
            "game_over": true
        }))
    }
}

//THREEJS RELATED VARIABLES

var scene,
    camera, fieldOfView, aspectRatio, nearPlane, farPlane,
    renderer,
    container,
    controls;

//SCREEN & MOUSE VARIABLES

var HEIGHT, WIDTH,
    mousePos = { x: 0, y: 0 };

//INIT THREE JS, SCREEN AND MOUSE EVENTS

function createScene() {

    HEIGHT = window.innerHeight;
    WIDTH = window.innerWidth;

    scene = new THREE.Scene();
    aspectRatio = WIDTH / HEIGHT;
    fieldOfView = 50;
    nearPlane = .1;
    farPlane = 10000;
    camera = new THREE.PerspectiveCamera(
        fieldOfView,
        aspectRatio,
        nearPlane,
        farPlane
    );
    scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);
    camera.position.x = 0;
    camera.position.z = 200;
    camera.position.y = game.planeDefaultHeight;
    //camera.lookAt(new THREE.Vector3(0, 400, 0));

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(WIDTH, HEIGHT);

    renderer.shadowMap.enabled = true;

    container = document.getElementById('world');
    container.appendChild(renderer.domElement);

    window.addEventListener('resize', handleWindowResize, false);

    /*
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.minPolarAngle = -Math.PI / 2;
    controls.maxPolarAngle = Math.PI ;
  
    //controls.noZoom = true;
    //controls.noPan = true;
    //*/
}

// MOUSE AND SCREEN EVENTS

function handleWindowResize() {
    HEIGHT = window.innerHeight;
    WIDTH = window.innerWidth;
    renderer.setSize(WIDTH, HEIGHT);
    camera.aspect = WIDTH / HEIGHT;
    camera.updateProjectionMatrix();
}

function handleMouseMove(event) {
    var tx = -1 + (event.clientX / WIDTH) * 2;
    var ty = 1 - (event.clientY / HEIGHT) * 2;
    mousePos = { x: tx, y: ty };
}

function handleTouchMove(event) {
    event.preventDefault();
    var tx = -1 + (event.touches[0].pageX / WIDTH) * 2;
    var ty = 1 - (event.touches[0].pageY / HEIGHT) * 2;
    mousePos = { x: tx, y: ty };
}

function handleMouseUp(event) {
    if (game.status == "waitingReplay") {
        resetGame();
        hideReplay();
    } else {
        projectileHolder.spawnProjectile()
    }
}


function handleTouchEnd(event) {
    if (game.status == "waitingReplay") {
        resetGame();
        hideReplay();
    }
}

// LIGHTS

var ambientLight, hemisphereLight, shadowLight;

function createLights() {

    hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, .9)

    ambientLight = new THREE.AmbientLight(0xdc8874, .5);

    shadowLight = new THREE.DirectionalLight(0xffffff, .9);
    shadowLight.position.set(150, 350, 350);
    shadowLight.castShadow = true;
    shadowLight.shadow.camera.left = -400;
    shadowLight.shadow.camera.right = 400;
    shadowLight.shadow.camera.top = 400;
    shadowLight.shadow.camera.bottom = -400;
    shadowLight.shadow.camera.near = 1;
    shadowLight.shadow.camera.far = 1000;
    shadowLight.shadow.mapSize.width = 4096;
    shadowLight.shadow.mapSize.height = 4096;

    var ch = new THREE.CameraHelper(shadowLight.shadow.camera);

    //scene.add(ch);
    scene.add(hemisphereLight);
    scene.add(shadowLight);
    scene.add(ambientLight);

}

var AirPlane = function () {
    this.mesh = new THREE.Object3D();
    this.mesh.name = "airPlane";

    // Cabin

    var geomCabin = new THREE.BoxGeometry(80, 50, 50, 1, 1, 1);
    var matCabin = new THREE.MeshPhongMaterial({ color: Colors.red, shading: THREE.FlatShading });

    geomCabin.vertices[4].y -= 10;
    geomCabin.vertices[4].z += 20;
    geomCabin.vertices[5].y -= 10;
    geomCabin.vertices[5].z -= 20;
    geomCabin.vertices[6].y += 30;
    geomCabin.vertices[6].z += 20;
    geomCabin.vertices[7].y += 30;
    geomCabin.vertices[7].z -= 20;

    var cabin = new THREE.Mesh(geomCabin, matCabin);
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    this.mesh.add(cabin);

    // Engine

    var geomEngine = new THREE.BoxGeometry(20, 50, 50, 1, 1, 1);
    var matEngine = new THREE.MeshPhongMaterial({ color: Colors.white, shading: THREE.FlatShading });
    var engine = new THREE.Mesh(geomEngine, matEngine);
    engine.position.x = 50;
    engine.castShadow = true;
    engine.receiveShadow = true;
    this.mesh.add(engine);

    // Tail Plane

    var geomTailPlane = new THREE.BoxGeometry(15, 20, 5, 1, 1, 1);
    var matTailPlane = new THREE.MeshPhongMaterial({ color: Colors.red, shading: THREE.FlatShading });
    var tailPlane = new THREE.Mesh(geomTailPlane, matTailPlane);
    tailPlane.position.set(-40, 20, 0);
    tailPlane.castShadow = true;
    tailPlane.receiveShadow = true;
    this.mesh.add(tailPlane);

    // Wings

    var geomSideWing = new THREE.BoxGeometry(30, 5, 120, 1, 1, 1);
    var matSideWing = new THREE.MeshPhongMaterial({ color: Colors.red, shading: THREE.FlatShading });
    var sideWing = new THREE.Mesh(geomSideWing, matSideWing);
    sideWing.position.set(0, 15, 0);
    sideWing.castShadow = true;
    sideWing.receiveShadow = true;
    this.mesh.add(sideWing);

    var geomWindshield = new THREE.BoxGeometry(3, 15, 20, 1, 1, 1);
    var matWindshield = new THREE.MeshPhongMaterial({ color: Colors.white, transparent: true, opacity: .3, shading: THREE.FlatShading });;
    var windshield = new THREE.Mesh(geomWindshield, matWindshield);
    windshield.position.set(5, 27, 0);

    windshield.castShadow = true;
    windshield.receiveShadow = true;

    this.mesh.add(windshield);

    var geomPropeller = new THREE.BoxGeometry(20, 10, 10, 1, 1, 1);
    geomPropeller.vertices[4].y -= 5;
    geomPropeller.vertices[4].z += 5;
    geomPropeller.vertices[5].y -= 5;
    geomPropeller.vertices[5].z -= 5;
    geomPropeller.vertices[6].y += 5;
    geomPropeller.vertices[6].z += 5;
    geomPropeller.vertices[7].y += 5;
    geomPropeller.vertices[7].z -= 5;
    var matPropeller = new THREE.MeshPhongMaterial({ color: Colors.brown, shading: THREE.FlatShading });
    this.propeller = new THREE.Mesh(geomPropeller, matPropeller);

    this.propeller.castShadow = true;
    this.propeller.receiveShadow = true;

    var geomBlade = new THREE.BoxGeometry(1, 80, 10, 1, 1, 1);
    var matBlade = new THREE.MeshPhongMaterial({ color: Colors.brownDark, shading: THREE.FlatShading });
    var blade1 = new THREE.Mesh(geomBlade, matBlade);
    blade1.position.set(8, 0, 0);

    blade1.castShadow = true;
    blade1.receiveShadow = true;

    var blade2 = blade1.clone();
    blade2.rotation.x = Math.PI / 2;

    blade2.castShadow = true;
    blade2.receiveShadow = true;

    this.propeller.add(blade1);
    this.propeller.add(blade2);
    this.propeller.position.set(60, 0, 0);
    this.mesh.add(this.propeller);

    var wheelProtecGeom = new THREE.BoxGeometry(30, 15, 10, 1, 1, 1);
    var wheelProtecMat = new THREE.MeshPhongMaterial({ color: Colors.red, shading: THREE.FlatShading });
    var wheelProtecR = new THREE.Mesh(wheelProtecGeom, wheelProtecMat);
    wheelProtecR.position.set(25, -20, 25);
    this.mesh.add(wheelProtecR);

    var wheelTireGeom = new THREE.BoxGeometry(24, 24, 4);
    var wheelTireMat = new THREE.MeshPhongMaterial({ color: Colors.brownDark, shading: THREE.FlatShading });
    var wheelTireR = new THREE.Mesh(wheelTireGeom, wheelTireMat);
    wheelTireR.position.set(25, -28, 25);

    var wheelAxisGeom = new THREE.BoxGeometry(10, 10, 6);
    var wheelAxisMat = new THREE.MeshPhongMaterial({ color: Colors.brown, shading: THREE.FlatShading });
    var wheelAxis = new THREE.Mesh(wheelAxisGeom, wheelAxisMat);
    wheelTireR.add(wheelAxis);

    this.mesh.add(wheelTireR);

    var wheelProtecL = wheelProtecR.clone();
    wheelProtecL.position.z = -wheelProtecR.position.z;
    this.mesh.add(wheelProtecL);

    var wheelTireL = wheelTireR.clone();
    wheelTireL.position.z = -wheelTireR.position.z;
    this.mesh.add(wheelTireL);

    var wheelTireB = wheelTireR.clone();
    wheelTireB.scale.set(.5, .5, .5);
    wheelTireB.position.set(-35, -5, 0);
    this.mesh.add(wheelTireB);

    var suspensionGeom = new THREE.BoxGeometry(4, 20, 4);
    suspensionGeom.applyMatrix(new THREE.Matrix4().makeTranslation(0, 10, 0))
    var suspensionMat = new THREE.MeshPhongMaterial({ color: Colors.red, shading: THREE.FlatShading });
    var suspension = new THREE.Mesh(suspensionGeom, suspensionMat);
    suspension.position.set(-35, -5, 0);
    suspension.rotation.z = -.3;
    this.mesh.add(suspension);

    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

};

Sky = function () {
    this.mesh = new THREE.Object3D();
    this.nClouds = 20;
    this.clouds = [];
    var stepAngle = Math.PI * 2 / this.nClouds;
    for (var i = 0; i < this.nClouds; i++) {
        var c = new Cloud();
        this.clouds.push(c);
        var a = stepAngle * i;
        var h = game.seaRadius + 150 + Math.random() * 200;
        c.mesh.position.y = Math.sin(a) * h;
        c.mesh.position.x = Math.cos(a) * h;
        c.mesh.position.z = -300 - Math.random() * 500;
        c.mesh.rotation.z = a + Math.PI / 2;
        var s = 1 + Math.random() * 2;
        c.mesh.scale.set(s, s, s);
        this.mesh.add(c.mesh);
    }
}

Sky.prototype.moveClouds = function () {
    for (var i = 0; i < this.nClouds; i++) {
        var c = this.clouds[i];
        c.rotate();
    }
    this.mesh.rotation.z += game.speed * deltaTime;

}

Sea = function () {
    var geom = new THREE.CylinderGeometry(game.seaRadius, game.seaRadius, game.seaLength, 40, 10);
    geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
    geom.mergeVertices();
    var l = geom.vertices.length;

    this.waves = [];

    for (var i = 0; i < l; i++) {
        var v = geom.vertices[i];
        //v.y = Math.random()*30;
        this.waves.push({
            y: v.y,
            x: v.x,
            z: v.z,
            ang: Math.random() * Math.PI * 2,
            amp: game.wavesMinAmp + Math.random() * (game.wavesMaxAmp - game.wavesMinAmp),
            speed: game.wavesMinSpeed + Math.random() * (game.wavesMaxSpeed - game.wavesMinSpeed)
        });
    };
    var mat = new THREE.MeshPhongMaterial({
        color: Colors.blue,
        transparent: true,
        opacity: .8,
        shading: THREE.FlatShading,

    });

    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.name = "waves";
    this.mesh.receiveShadow = true;

}

Sea.prototype.moveWaves = function () {
    var verts = this.mesh.geometry.vertices;
    var l = verts.length;
    for (var i = 0; i < l; i++) {
        var v = verts[i];
        var vprops = this.waves[i];
        v.x = vprops.x + Math.cos(vprops.ang) * vprops.amp;
        v.y = vprops.y + Math.sin(vprops.ang) * vprops.amp;
        vprops.ang += vprops.speed * deltaTime;
        this.mesh.geometry.verticesNeedUpdate = true;
    }
}

Cloud = function () {
    this.mesh = new THREE.Object3D();
    this.mesh.name = "cloud";
    var geom = new THREE.CubeGeometry(20, 20, 20);
    var mat = new THREE.MeshPhongMaterial({
        color: Colors.white,

    });

    //*
    var nBlocs = 3 + Math.floor(Math.random() * 3);
    for (var i = 0; i < nBlocs; i++) {
        var m = new THREE.Mesh(geom.clone(), mat);
        m.position.x = i * 15;
        m.position.y = Math.random() * 10;
        m.position.z = Math.random() * 10;
        m.rotation.z = Math.random() * Math.PI * 2;
        m.rotation.y = Math.random() * Math.PI * 2;
        var s = .1 + Math.random() * .9;
        m.scale.set(s, s, s);
        this.mesh.add(m);
        m.castShadow = true;
        m.receiveShadow = true;

    }
    //*/
}

Cloud.prototype.rotate = function () {
    var l = this.mesh.children.length;
    for (var i = 0; i < l; i++) {
        var m = this.mesh.children[i];
        m.rotation.z += Math.random() * .005 * (i + 1);
        m.rotation.y += Math.random() * .002 * (i + 1);
    }
}

Projectile = function () {
    var geom = new THREE.TetrahedronGeometry(3, 0);
    var mat = new THREE.MeshPhongMaterial({
        color: Colors.blue,
        shininess: 0,
        specular: 0xffffff,
        shading: THREE.FlatShading
    });
    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.castShadow = true;
    this.angle = 0;
    this.dist = 0;
    this.veloX = 2000
    this.veloY = 0
}

ProjectileHolder = function () {
    this.mesh = new THREE.Object3D();
    this.projectilesInUse = [];
}

ProjectileHolder.prototype.spawnProjectile = function () {
    if (this.projectilesInUse.length < 1) {
        for (let i = 0; i < game.maxProjectile; i++) {
            var projectile;
            if (projectilePool.length) {
                projectile = projectilePool.pop();
            } else {
                projectile = new Projectile();
            }

            projectile.angle = 0
            projectile.mesh.position.y = airplane.mesh.position.y;
            projectile.mesh.position.x = airplane.mesh.position.x;
            projectile.veloX = 2000
            projectile.veloY = Math.floor((i + 1) / 2) * (2 * ((i - 1) % 2) - 1) * 200

            this.mesh.add(projectile.mesh);
            this.projectilesInUse.push(projectile);
        }
    }
}

ProjectileHolder.prototype.rotateProjectiles = function () {
    for (var i = 0; i < this.projectilesInUse.length; i++) {
        var projectile = this.projectilesInUse[i];
        projectile.angle += game.speed * deltaTime * game.ennemiesSpeed * 40;

        // projectile.mesh.position.y = -game.seaRadius + Math.sin(projectile.angle)*projectile.distance;
        projectile.mesh.position.x += game.speed * deltaTime * game.ennemiesSpeed * projectile.veloX;
        projectile.mesh.position.y += game.speed * deltaTime * game.ennemiesSpeed * projectile.veloY;

        if (projectile.angle > Math.PI * 2) {
            projectilePool.unshift(this.projectilesInUse.splice(i, 1)[0]);
            this.mesh.remove(projectile.mesh);
            i--;
            continue
        }

        //var globalEnnemyPosition =  projectile.mesh.localToWorld(new THREE.Vector3());
        for (var j = 0; j < ennemiesHolder.ennemiesInUse.length; j++) {
            var ennemy = ennemiesHolder.ennemiesInUse[j];
            var diffPos = ennemy.mesh.position.clone().sub(projectile.mesh.position.clone());
            var d = diffPos.length();
            if (d < game.ennemyDistanceTolerance) {
                particlesHolder.spawnParticles(ennemy.mesh.position.clone(), 15, Colors.red, 3);
                ennemiesPool.unshift(ennemiesHolder.ennemiesInUse.splice(j, 1)[0])
                ennemiesHolder.mesh.remove(ennemy.mesh)
                projectilePool.unshift(this.projectilesInUse.splice(i, 1)[0]);
                this.mesh.remove(projectile.mesh);
                i--;
                game.score += 50
                updateConnectionScore()
                break
            }
        }
    }
}

Ennemy = function () {
    var geom = new THREE.TetrahedronGeometry(6, 1);
    // var geom = new THREE.PolyhedronGeometry(vets, faces, 6,0);
    var mat = new THREE.MeshPhongMaterial({
        color: Colors.red,
        shininess: 0,
        specular: 0xffffff,
        shading: THREE.FlatShading
    });
    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.castShadow = true;
    this.angle = 0;
    this.dist = 0;
    this.veloX = 0;
    this.veloY = 0;
    this.deltaY = 0;
    this.fireVelo = false
}

SelectorNode = function (nodes) {
    return (enemy) => {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i](enemy)) {
                return true
            }
        }
        return false
    }
}

SequenceNode = function (nodes) {
    return (enemy) => {
        for (let i = 0; i < nodes.length; i++) {
            if (!nodes[i](enemy)) {
                return false
            }
        }
        return true
    }
}

var ennemyTree = new SelectorNode([
    new SequenceNode([
        (ennemy) => {
            var diffPos = airplane.mesh.position.clone().sub(ennemy.mesh.position.clone());
            var d = diffPos.length();
            return (d < game.ennemyDistanceDetectPlayer) || ennemy.fireVelo
        },
        (ennemy) => {
            if (!ennemy.fireVelo) {
                ennemy.veloX = (airplane.mesh.position.x - ennemy.mesh.position.x) / 20
                ennemy.veloY = (airplane.mesh.position.y - ennemy.mesh.position.y) / 20
                ennemy.fireVelo = true
            }

            ennemy.angle += game.speed * deltaTime * game.ennemiesSpeed;
            if (ennemy.angle > Math.PI * 2) ennemy.angle -= Math.PI * 2;
            ennemy.mesh.position.x += ennemy.veloX
            ennemy.mesh.position.y += ennemy.veloY
            return true
        }
    ]),
    new SequenceNode([
        (ennemy) => {
            for (let i = 0; i < projectileHolder.projectilesInUse.length; i++) {
                var diffPos = projectileHolder.projectilesInUse[i].mesh.position.clone().sub(ennemy.mesh.position.clone());
                var d = diffPos.length();
                if (d < game.ennemyDistanceDetectProjectile) return true;
            }

            return false;
        },
        (ennemy) => {
            let ys = []
            for (let i = 0; i < projectileHolder.projectilesInUse.length; i++) {
                var diffPos = projectileHolder.projectilesInUse[i].mesh.position.clone().sub(ennemy.mesh.position.clone());
                var d = diffPos.length();
                if (d < game.ennemyDistanceDetectProjectile && projectileHolder.projectilesInUse[i].mesh.position.x < ennemy.mesh.position.x) 
                    ys.push(projectileHolder.projectilesInUse[i].mesh.position.y);
            }

            let curY = ennemy.mesh.position.y
            let desY = curY
            for (y of ys) {
                if (Math.abs(y - curY) <= game.ennemyDistanceTolerance) {
                    if (y != curY) { 
                        desY += game.ennemyDistanceTolerance * game.ennemyDistanceTolerance / (curY - y)
                    } else {
                        desY += game.ennemyDistanceTolerance
                    }
                }
            }

            if (desY < curY) {
                ennemy.deltaY += Math.max(-1, (desY - curY) * 0.1)
            } else if (desY > curY) {
                ennemy.deltaY += Math.min(1, (desY - curY) * 0.1)
            }

            ennemy.angle += game.speed * deltaTime * game.ennemiesSpeed;
            if (ennemy.angle > Math.PI * 2) ennemy.angle -= Math.PI * 2;
            ennemy.mesh.position.y = -game.seaRadius + Math.sin(ennemy.angle) * ennemy.distance + ennemy.deltaY;
            ennemy.mesh.position.x = Math.cos(ennemy.angle) * ennemy.distance;
            return true
        }
    ]),
    new SequenceNode([
        (ennemy) => {
            ennemy.angle += game.speed * deltaTime * game.ennemiesSpeed;
            if (ennemy.angle > Math.PI * 2) ennemy.angle -= Math.PI * 2;
            ennemy.mesh.position.y = -game.seaRadius + Math.sin(ennemy.angle) * ennemy.distance + ennemy.deltaY;
            ennemy.mesh.position.x = Math.cos(ennemy.angle) * ennemy.distance;
            return true
        }
    ]),
])

EnnemiesHolder = function () {
    this.mesh = new THREE.Object3D();
    this.ennemiesInUse = [];
}

EnnemiesHolder.prototype.spawnEnnemies = function () {
    var nEnnemies = game.level;

    for (var i = 0; i < nEnnemies; i++) {
        var ennemy;
        if (ennemiesPool.length) {
            ennemy = ennemiesPool.pop();
        } else {
            ennemy = new Ennemy();
        }

        ennemy.angle = - (i * 0.1);
        ennemy.distance = game.seaRadius + game.planeDefaultHeight + (-1 + Math.random() * 2) * (game.planeAmpHeight - 20);
        ennemy.mesh.position.y = -game.seaRadius + Math.sin(ennemy.angle) * ennemy.distance;
        ennemy.mesh.position.x = Math.cos(ennemy.angle) * ennemy.distance;
        ennemy.veloX = 0
        ennemy.veloY = 0
        ennemy.deltaY = 0
        ennemy.fireVelo = false

        this.mesh.add(ennemy.mesh);
        this.ennemiesInUse.push(ennemy);
    }
}

EnnemiesHolder.prototype.rotateEnnemies = function () {
    for (var i = 0; i < this.ennemiesInUse.length; i++) {
        var ennemy = this.ennemiesInUse[i];
        ennemyTree(ennemy)

        var diffPos = airplane.mesh.position.clone().sub(ennemy.mesh.position.clone());
        var d = diffPos.length();
        if (d < game.ennemyDistanceTolerance) {
            particlesHolder.spawnParticles(ennemy.mesh.position.clone(), 15, Colors.red, 3);

            ennemiesPool.unshift(this.ennemiesInUse.splice(i, 1)[0]);
            this.mesh.remove(ennemy.mesh);
            game.planeCollisionSpeedX = 100 * diffPos.x / d;
            game.planeCollisionSpeedY = 100 * diffPos.y / d;
            ambientLight.intensity = 2;

            removeEnergy();
            i--;
        } else if (ennemy.angle > Math.PI * 0.75) {
            ennemiesPool.unshift(this.ennemiesInUse.splice(i, 1)[0]);
            this.mesh.remove(ennemy.mesh);
            i--;
        }
    }
}

Particle = function () {
    var geom = new THREE.TetrahedronGeometry(3, 0);
    var mat = new THREE.MeshPhongMaterial({
        color: 0x009999,
        shininess: 0,
        specular: 0xffffff,
        shading: THREE.FlatShading
    });
    this.mesh = new THREE.Mesh(geom, mat);
}

Particle.prototype.explode = function (pos, color, scale) {
    var _this = this;
    var _p = this.mesh.parent;
    this.mesh.material.color = new THREE.Color(color);
    this.mesh.material.needsUpdate = true;
    this.mesh.scale.set(scale, scale, scale);
    var targetX = pos.x + (-1 + Math.random() * 2) * 50;
    var targetY = pos.y + (-1 + Math.random() * 2) * 50;
    var speed = .6 + Math.random() * .2;
    TweenMax.to(this.mesh.rotation, speed, { x: Math.random() * 12, y: Math.random() * 12 });
    TweenMax.to(this.mesh.scale, speed, { x: .1, y: .1, z: .1 });
    TweenMax.to(this.mesh.position, speed, {
        x: targetX, y: targetY, delay: Math.random() * .1, ease: Power2.easeOut, onComplete: function () {
            if (_p) _p.remove(_this.mesh);
            _this.mesh.scale.set(1, 1, 1);
            particlesPool.unshift(_this);
        }
    });
}

ParticlesHolder = function () {
    this.mesh = new THREE.Object3D();
    this.particlesInUse = [];
}

ParticlesHolder.prototype.spawnParticles = function (pos, density, color, scale) {

    var nPArticles = density;
    for (var i = 0; i < nPArticles; i++) {
        var particle;
        if (particlesPool.length) {
            particle = particlesPool.pop();
        } else {
            particle = new Particle();
        }
        this.mesh.add(particle.mesh);
        particle.mesh.visible = true;
        var _this = this;
        particle.mesh.position.y = pos.y;
        particle.mesh.position.x = pos.x;
        particle.explode(pos, color, scale);
    }
}

Upgrade = function () {
    var geom = new THREE.TorusKnotGeometry(5, 1, 15, 3, 4, 2);
    var mat = new THREE.MeshPhongMaterial({
        color: Colors.yellow,
        shininess: 0,
        specular: 0xffffff,
        shading: THREE.FlatShading
    });
    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.castShadow = true;
    this.angle = 0;
    this.dist = 0;
    this.exploding = false
}

UpgradeHolder = function () {
    this.mesh = new THREE.Object3D();
    this.upgradeInUse = [];
    this.upgradePool = [];
    var upgrade = new Upgrade();
    this.upgradePool.push(upgrade);
}

UpgradeHolder.prototype.spawnUpgrade = function () {
    var d = game.seaRadius + game.planeDefaultHeight + (-1 + Math.random() * 2) * (game.planeAmpHeight - 20);
    var amplitude = 10 + Math.round(Math.random() * 10);
    var upgrade;
    if (this.upgradePool.length) {
        upgrade = this.upgradePool.pop();
    } else {
        upgrade = new Upgrade();
    }
    this.mesh.add(upgrade.mesh);
    this.upgradeInUse.push(upgrade);
    upgrade.angle = -0.02;
    upgrade.distance = d + Math.cos(.5) * amplitude;
    upgrade.mesh.position.y = -game.seaRadius + Math.sin(upgrade.angle) * upgrade.distance;
    upgrade.mesh.position.x = Math.cos(upgrade.angle) * upgrade.distance;
}

UpgradeHolder.prototype.rotateUpgrade = function () {
    for (var i = 0; i < this.upgradeInUse.length; i++) {
        var upgrade = this.upgradeInUse[i];
        if (upgrade.exploding) continue;
        upgrade.angle += game.speed * deltaTime * game.upgradeSpeed;
        if (upgrade.angle > Math.PI * 2) upgrade.angle -= Math.PI * 2;
        upgrade.mesh.position.y = -game.seaRadius + Math.sin(upgrade.angle) * upgrade.distance;
        upgrade.mesh.position.x = Math.cos(upgrade.angle) * upgrade.distance;
        upgrade.mesh.rotation.z += Math.random() * .1;
        upgrade.mesh.rotation.y += Math.random() * .1;

        //var globalCoinPosition =  upgrade.mesh.localToWorld(new THREE.Vector3());
        var diffPos = airplane.mesh.position.clone().sub(upgrade.mesh.position.clone());
        var d = diffPos.length();
        if (d < game.upgradeDistanceTolerance) {
            upgrade.exploding = true
            this.upgradePool.unshift(this.upgradeInUse.splice(i, 1)[0]);
            this.mesh.remove(upgrade.mesh);
            particlesHolder.spawnParticles(upgrade.mesh.position.clone(), 5, Colors.yellow, .8);
            addMaxProjectile();
            i--;
        } else if (upgrade.angle > Math.PI) {
            this.upgradePool.unshift(this.upgradeInUse.splice(i, 1)[0]);
            this.mesh.remove(upgrade.mesh);
            i--;
        }
    }
}

Coin = function () {
    var geom = new THREE.TetrahedronGeometry(5, 0);
    var mat = new THREE.MeshPhongMaterial({
        color: 0x009999,
        shininess: 0,
        specular: 0xffffff,

        shading: THREE.FlatShading
    });
    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.castShadow = true;
    this.angle = 0;
    this.dist = 0;
}

CoinsHolder = function (nCoins) {
    this.mesh = new THREE.Object3D();
    this.coinsInUse = [];
    this.coinsPool = [];
    for (var i = 0; i < nCoins; i++) {
        var coin = new Coin();
        this.coinsPool.push(coin);
    }
}

CoinsHolder.prototype.spawnCoins = function () {

    var nCoins = 1 + Math.floor(Math.random() * 10);
    var d = game.seaRadius + game.planeDefaultHeight + (-1 + Math.random() * 2) * (game.planeAmpHeight - 20);
    var amplitude = 10 + Math.round(Math.random() * 10);
    for (var i = 0; i < nCoins; i++) {
        var coin;
        if (this.coinsPool.length) {
            coin = this.coinsPool.pop();
        } else {
            coin = new Coin();
        }
        this.mesh.add(coin.mesh);
        this.coinsInUse.push(coin);
        coin.angle = - (i * 0.02);
        coin.distance = d + Math.cos(i * .5) * amplitude;
        coin.mesh.position.y = -game.seaRadius + Math.sin(coin.angle) * coin.distance;
        coin.mesh.position.x = Math.cos(coin.angle) * coin.distance;
    }
}

CoinsHolder.prototype.rotateCoins = function () {
    for (var i = 0; i < this.coinsInUse.length; i++) {
        var coin = this.coinsInUse[i];
        if (coin.exploding) continue;
        coin.angle += game.speed * deltaTime * game.coinsSpeed;
        if (coin.angle > Math.PI * 2) coin.angle -= Math.PI * 2;
        coin.mesh.position.y = -game.seaRadius + Math.sin(coin.angle) * coin.distance;
        coin.mesh.position.x = Math.cos(coin.angle) * coin.distance;
        coin.mesh.rotation.z += Math.random() * .1;
        coin.mesh.rotation.y += Math.random() * .1;

        //var globalCoinPosition =  coin.mesh.localToWorld(new THREE.Vector3());
        var diffPos = airplane.mesh.position.clone().sub(coin.mesh.position.clone());
        var d = diffPos.length();
        if (d < game.coinDistanceTolerance) {
            this.coinsPool.unshift(this.coinsInUse.splice(i, 1)[0]);
            this.mesh.remove(coin.mesh);
            particlesHolder.spawnParticles(coin.mesh.position.clone(), 5, 0x009999, .8);
            addEnergy();
            i--;
        } else if (coin.angle > Math.PI) {
            this.coinsPool.unshift(this.coinsInUse.splice(i, 1)[0]);
            this.mesh.remove(coin.mesh);
            i--;
        }
    }
}


// 3D Models
var sea;
var airplane;

function createPlane() {
    airplane = new AirPlane();
    airplane.mesh.scale.set(.25, .25, .25);
    airplane.mesh.position.y = game.planeDefaultHeight;
    scene.add(airplane.mesh);
}

function createSea() {
    sea = new Sea();
    sea.mesh.position.y = -game.seaRadius;
    scene.add(sea.mesh);
}

function createSky() {
    sky = new Sky();
    sky.mesh.position.y = -game.seaRadius;
    scene.add(sky.mesh);
}

function createCoins() {

    coinsHolder = new CoinsHolder(20);
    scene.add(coinsHolder.mesh)
}

function createUpgrade() {

    upgradeHolder = new UpgradeHolder();
    scene.add(upgradeHolder.mesh)
}

function createEnnemies() {
    for (var i = 0; i < 10; i++) {
        var ennemy = new Ennemy();
        ennemiesPool.push(ennemy);
    }
    ennemiesHolder = new EnnemiesHolder();
    //ennemiesHolder.mesh.position.y = -game.seaRadius;
    scene.add(ennemiesHolder.mesh)
}

function createParticles() {
    for (var i = 0; i < 10; i++) {
        var particle = new Particle();
        particlesPool.push(particle);
    }
    particlesHolder = new ParticlesHolder();

    //ennemiesHolder.mesh.position.y = -game.seaRadius;
    scene.add(particlesHolder.mesh)
}

function createProjectile() {
    for (var i = 0; i < 10; i++) {
        var projectile = new Projectile();
        projectilePool.push(projectile);
    }
    projectileHolder = new ProjectileHolder();

    //ennemiesHolder.mesh.position.y = -game.seaRadius;
    scene.add(projectileHolder.mesh)
}

function loop() {

    newTime = new Date().getTime();
    deltaTime = newTime - oldTime;
    oldTime = newTime;

    if (game.status == "playing") {

        // Add energy coins every 100m;
        if (Math.floor(game.distance) % game.distanceForCoinsSpawn == 0 && Math.floor(game.distance) > game.coinLastSpawn) {
            game.coinLastSpawn = Math.floor(game.distance);
            coinsHolder.spawnCoins();
        }

        if (Math.floor(game.distance) % game.distanceForSpeedUpdate == 0 && Math.floor(game.distance) > game.speedLastUpdate) {
            game.speedLastUpdate = Math.floor(game.distance);
            game.targetBaseSpeed += game.incrementSpeedByTime * deltaTime;
        }


        if (Math.floor(game.distance) % game.distanceForEnnemiesSpawn == 0 && Math.floor(game.distance) > game.ennemyLastSpawn) {
            game.ennemyLastSpawn = Math.floor(game.distance);
            ennemiesHolder.spawnEnnemies();
        }

        if (Math.floor(game.distance) % game.distanceForUpgradeSpawn == 0 && Math.floor(game.distance) > game.upgradeLastSpawn) {
            game.upgradeLastSpawn = Math.floor(game.distance);
            upgradeHolder.spawnUpgrade();
        }

        if (Math.floor(game.distance) % game.distanceForLevelUpdate == 0 && Math.floor(game.distance) > game.levelLastUpdate) {
            game.levelLastUpdate = Math.floor(game.distance);
            game.level++;
            if (connection != null) {
                connection.send(JSON.stringify({
                    "content": `${game.pilot} ascended to level ${game.level}!`
                }))
            }
            fieldLevel.innerHTML = Math.floor(game.level);

            game.targetBaseSpeed = game.initSpeed + game.incrementSpeedByLevel * game.level
        }


        updatePlane();
        updateDistance();
        updateEnergy();
        // game.baseSpeed += (game.targetBaseSpeed - game.baseSpeed) * deltaTime * 0.02;
        game.speed = game.baseSpeed * game.planeSpeed;

    } else if (game.status == "gameover") {
        game.speed *= .99;
        airplane.mesh.rotation.z += (-Math.PI / 2 - airplane.mesh.rotation.z) * .0002 * deltaTime;
        airplane.mesh.rotation.x += 0.0003 * deltaTime;
        game.planeFallSpeed *= 1.05;
        airplane.mesh.position.y -= game.planeFallSpeed * deltaTime;

        if (airplane.mesh.position.y < -200) {
            showReplay();
            game.status = "waitingReplay";

        }
    } else if (game.status == "waitingReplay") {

    }


    airplane.propeller.rotation.x += .2 + game.planeSpeed * deltaTime * .005;
    sea.mesh.rotation.z += game.speed * deltaTime;//*game.seaRotationSpeed;

    if (sea.mesh.rotation.z > 2 * Math.PI) sea.mesh.rotation.z -= 2 * Math.PI;

    ambientLight.intensity += (.5 - ambientLight.intensity) * deltaTime * 0.005;

    coinsHolder.rotateCoins();
    ennemiesHolder.rotateEnnemies();
    projectileHolder.rotateProjectiles();
    upgradeHolder.rotateUpgrade();

    sky.moveClouds();
    sea.moveWaves();

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
}

function updateDistance() {
    game.distance += game.speed * deltaTime * game.ratioSpeedDistance;
    fieldDistance.innerHTML = Math.floor(game.score);
    var d = 502 * (1 - (game.distance % game.distanceForLevelUpdate) / game.distanceForLevelUpdate);
    levelCircle.setAttribute("stroke-dashoffset", d);

}

var blinkEnergy = false;

function updateEnergy() {
    // game.energy -= game.speed*deltaTime*game.ratioSpeedEnergy;
    game.energy = Math.max(0, game.energy);
    energyBar.style.right = (100 - game.energy) + "%";
    energyBar.style.backgroundColor = (game.energy < 50) ? "#f25346" : "#68c3c0";

    if (game.energy < 30) {
        energyBar.style.animationName = "blinking";
    } else {
        energyBar.style.animationName = "none";
    }

    if (game.energy < 1) {
        game.status = "gameover";
        updateConnectionDead()
    }
}

function addEnergy() {
    // game.energy += game.coinValue;
    game.score += game.coinValue
    updateConnectionScore()
    game.energy = Math.min(game.energy, 100);
}

function removeEnergy() {
    game.energy -= game.ennemyValue;
    game.energy = Math.max(0, game.energy);
}

function addMaxProjectile() {
    // game.energy += game.coinValue;
    game.maxProjectile += 1
}

function updatePlane() {

    game.planeSpeed = normalize(mousePos.x, -.5, .5, game.planeMinSpeed, game.planeMaxSpeed);
    var targetY = normalize(mousePos.y, -.75, .75, game.planeDefaultHeight - game.planeAmpHeight, game.planeDefaultHeight + game.planeAmpHeight);
    var targetX = normalize(mousePos.x, -1, 1, -game.planeAmpWidth * 1.5, -game.planeAmpWidth * 1.5);

    game.planeCollisionDisplacementX += game.planeCollisionSpeedX;
    targetX += game.planeCollisionDisplacementX;


    game.planeCollisionDisplacementY += game.planeCollisionSpeedY;
    targetY += game.planeCollisionDisplacementY;

    airplane.mesh.position.y += (targetY - airplane.mesh.position.y) * deltaTime * game.planeMoveSensivity;
    airplane.mesh.position.x += (targetX - airplane.mesh.position.x) * deltaTime * game.planeMoveSensivity;

    airplane.mesh.rotation.z = (targetY - airplane.mesh.position.y) * deltaTime * game.planeRotXSensivity;
    airplane.mesh.rotation.x = (airplane.mesh.position.y - targetY) * deltaTime * game.planeRotZSensivity;
    // var targetCameraZ = normalize(game.planeSpeed, game.planeMinSpeed, game.planeMaxSpeed, game.cameraNearPos, game.cameraFarPos);
    // camera.fov = normalize(mousePos.x,-1,1,40, 80);
    // camera.updateProjectionMatrix ()
    // camera.position.y += (airplane.mesh.position.y - camera.position.y)*deltaTime*game.cameraSensivity;

    game.planeCollisionSpeedX += (0 - game.planeCollisionSpeedX) * deltaTime * 0.03;
    game.planeCollisionDisplacementX += (0 - game.planeCollisionDisplacementX) * deltaTime * 0.01;
    game.planeCollisionSpeedY += (0 - game.planeCollisionSpeedY) * deltaTime * 0.03;
    game.planeCollisionDisplacementY += (0 - game.planeCollisionDisplacementY) * deltaTime * 0.01;
}

function showReplay() {
    replayMessage.style.display = "block";
}

function hideReplay() {
    replayMessage.style.display = "none";
}

function normalize(v, vmin, vmax, tmin, tmax) {
    var nv = Math.max(Math.min(v, vmax), vmin);
    var dv = vmax - vmin;
    var pc = (nv - vmin) / dv;
    var dt = tmax - tmin;
    var tv = tmin + (pc * dt);
    return tv;
}

var fieldDistance, energyBar, replayMessage, fieldLevel, levelCircle;

function init(event) {

    // UI

    fieldDistance = document.getElementById("distValue");
    energyBar = document.getElementById("energyBar");
    replayMessage = document.getElementById("replayMessage");
    fieldLevel = document.getElementById("levelValue");
    levelCircle = document.getElementById("levelCircleStroke");

    resetGame();
    createScene();

    createLights();
    createPlane();
    createSea();
    createSky();
    createCoins();
    createEnnemies();
    createParticles();
    createProjectile();
    createUpgrade();

    document.addEventListener('mousemove', handleMouseMove, false);
    document.addEventListener('touchmove', handleTouchMove, false);
    document.addEventListener('mouseup', handleMouseUp, false);
    document.addEventListener('touchend', handleTouchEnd, false);

    loop();
}

window.addEventListener('load', init, false);
