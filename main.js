let scene;
let camera;
let renderer;
let raycaster;
let lastFrame = 0;
let lastShot = 0;
let round = 1;
let score = 0;
let money = 800;
let waveStarted = false;
let roundTransition = false;
let gameOver = false;
let paused = true;
let firing = false;
let reloading = false;
let mouseSensitivity = 0.002;
let yaw = 0;
let pitch = 0;
let recoil = 0;
let playerHealth = 100;
let playerArmor = 0;
let playerVelocityY = 0;
let grounded = true;
let crouching = false;
let moving = false;
let bots = [];
let solids = [];
let viewmodels = {};
let keys = Object.create(null);
let activeWeapon = 'sidearm';
let weaponState = {};

const weapons = {
    sidearm: { name: 'P200', damage: 34, magazine: 13, reserve: 52, fireRate: 0.23, spread: 0.012, automatic: false, cost: 0, range: 90 },
    rifle: { name: 'R-7', damage: 27, magazine: 30, reserve: 90, fireRate: 0.095, spread: 0.018, automatic: true, cost: 2700, range: 120 }
};

const ui = {};

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9ba8a2);
    scene.fog = new THREE.Fog(0x9ba8a2, 55, 145);

    camera = new THREE.PerspectiveCamera(78, window.innerWidth / window.innerHeight, 0.1, 180);
    camera.position.set(0, 1.7, 22);
    camera.rotation.order = 'YXZ';

    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.insertBefore(renderer.domElement, document.body.firstChild);

    raycaster = new THREE.Raycaster();
    raycaster.far = 130;
    scene.add(camera);
    createArena();
    createViewmodels();
    createHud();
    setupInput();
    updateHud();
    requestAnimationFrame(animate);
}

function material(color, roughness) {
    return new THREE.MeshLambertMaterial({ color, flatShading: true, ...roughness });
}

function addBox(x, y, z, width, height, depth, color, solid = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material(color));
    mesh.position.set(x, y, z);
    mesh.receiveShadow = false;
    scene.add(mesh);
    if (solid) solids.push({ x, z, halfX: width / 2, halfZ: depth / 2 });
    return mesh;
}

function createArena() {
    scene.add(new THREE.HemisphereLight(0xdce8dc, 0x4d514d, 1.7));
    const sun = new THREE.DirectionalLight(0xffe7c2, 1.25);
    sun.position.set(-15, 28, 12);
    scene.add(sun);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), material(0x777d73));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    const wall = material(0x77766b);
    addBox(0, 4, -34, 72, 8, 2, 0x77766b);
    addBox(-36, 4, 0, 2, 8, 70, 0x686c65);
    addBox(36, 4, 0, 2, 8, 70, 0x686c65);
    addBox(0, 4, 34, 72, 8, 2, 0x77766b);

    addBox(-12, 1.3, -10, 10, 2.6, 2.2, 0x9a8c74);
    addBox(11, 1.2, -15, 8, 2.4, 2.4, 0x879080);
    addBox(0, 1.1, -1, 3, 2.2, 9, 0x8b806c);
    addBox(-20, 1.5, 7, 5, 3, 5, 0x8c7961);
    addBox(18, 1.4, 9, 6, 2.8, 4, 0x7c897b);
    addBox(11, 1.1, 19, 3, 2.2, 7, 0x8d8b79);
    addBox(-9, 0.75, -23, 8, 1.5, 3, 0x8d8b79);

    const stripeMaterial = material(0xb4aa91);
    for (let index = -3; index <= 3; index++) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 50), stripeMaterial);
        stripe.position.set(index * 5, 0.012, -5);
        scene.add(stripe);
    }
    createBuyStation(-29, 0.03, 25, 0xc2a56f);
    createBuyStation(29, 0.03, -25, 0x6b8786);
}

function createViewmodels() {
    const darkMetal = material(0x343a36);
    const edgeMetal = material(0x596058);
    const gripMaterial = material(0x292e2b);
    const addPart = (group, size, position, partMaterial, rotationX = 0) => {
        const part = new THREE.Mesh(new THREE.BoxGeometry(...size), partMaterial);
        part.position.set(...position);
        part.rotation.x = rotationX;
        group.add(part);
    };

    const sidearm = new THREE.Group();
    addPart(sidearm, [0.15, 0.08, 0.34], [0.25, -0.24, -0.53], edgeMetal);
    addPart(sidearm, [0.09, 0.045, 0.16], [0.25, -0.23, -0.78], darkMetal);
    addPart(sidearm, [0.09, 0.17, 0.13], [0.25, -0.35, -0.43], gripMaterial, -0.18);
    addPart(sidearm, [0.035, 0.03, 0.035], [0.25, -0.185, -0.64], gripMaterial);

    const rifle = new THREE.Group();
    addPart(rifle, [0.17, 0.13, 0.39], [0.23, -0.26, -0.57], edgeMetal);
    addPart(rifle, [0.075, 0.06, 0.42], [0.23, -0.23, -0.96], darkMetal);
    addPart(rifle, [0.14, 0.11, 0.24], [0.23, -0.28, -0.23], gripMaterial);
    addPart(rifle, [0.09, 0.19, 0.12], [0.23, -0.39, -0.57], gripMaterial, -0.12);
    addPart(rifle, [0.09, 0.14, 0.1], [0.23, -0.39, -0.68], darkMetal, -0.12);
    addPart(rifle, [0.08, 0.04, 0.13], [0.23, -0.17, -0.52], gripMaterial);
    addPart(rifle, [0.04, 0.035, 0.04], [0.23, -0.16, -0.88], gripMaterial);

    viewmodels = { sidearm, rifle };
    sidearm.visible = true;
    rifle.visible = false;
    camera.add(sidearm);
    camera.add(rifle);
}

function createBuyStation(x, y, z, color) {
    const marker = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.05, 3.5), material(color));
    marker.position.set(x, y, z);
    scene.add(marker);
}

function createHud() {
    ui.start = document.getElementById('start-screen');
    ui.pause = document.getElementById('pause-screen');
    ui.dead = document.getElementById('dead-screen');
    ui.buy = document.getElementById('buy-menu');
    ui.health = document.getElementById('health-value');
    ui.armor = document.getElementById('armor-value');
    ui.ammo = document.getElementById('ammo-value');
    ui.reserve = document.getElementById('reserve-value');
    ui.weapon = document.getElementById('weapon-name');
    ui.money = document.getElementById('money-value');
    ui.score = document.getElementById('score-value');
    ui.round = document.getElementById('round-value');
    ui.botCount = document.getElementById('bot-count');
    ui.message = document.getElementById('match-message');

    document.getElementById('play-button').addEventListener('click', beginMatch);
    document.getElementById('resume-button').addEventListener('click', requestLock);
    document.getElementById('restart-button').addEventListener('click', restartMatch);
    document.getElementById('buy-button').addEventListener('click', toggleBuyMenu);
    document.getElementById('buy-close').addEventListener('click', toggleBuyMenu);
    document.querySelectorAll('[data-buy]').forEach((button) => {
        button.addEventListener('click', () => purchase(button.dataset.buy));
    });
}

function setupInput() {
    document.addEventListener('pointerlockchange', () => {
        paused = document.pointerLockElement !== renderer.domElement;
        if (!waveStarted || gameOver || ui.buy.classList.contains('visible')) return;
        ui.pause.classList.toggle('visible', paused);
    });

    document.addEventListener('mousemove', (event) => {
        if (document.pointerLockElement !== renderer.domElement) return;
        yaw -= event.movementX * mouseSensitivity;
        pitch -= event.movementY * mouseSensitivity;
        pitch = Math.max(-1.45, Math.min(1.45, pitch));
        camera.rotation.set(pitch - recoil, yaw, 0, 'YXZ');
    });

    document.addEventListener('keydown', (event) => {
        keys[event.code] = true;
        if (event.repeat) return;
        if (event.code === 'KeyB' && waveStarted && !gameOver) toggleBuyMenu();
        if (event.code === 'KeyR') reloadWeapon();
        if (event.code === 'Digit1') switchWeapon('sidearm');
        if (event.code === 'Digit2' && weaponState.rifle) switchWeapon('rifle');
        if (event.code === 'Space' && grounded && !crouching && !gameOver && !paused) {
            playerVelocityY = 5.2;
            grounded = false;
        }
        if (event.code === 'Escape') closeBuyMenu();
    });
    document.addEventListener('keyup', (event) => { keys[event.code] = false; });
    document.addEventListener('mousedown', (event) => {
        if (event.button !== 0 || document.pointerLockElement !== renderer.domElement) return;
        if (weapons[activeWeapon].automatic) firing = true;
        else shoot(performance.now());
    });
    document.addEventListener('mouseup', (event) => { if (event.button === 0) firing = false; });
    renderer.domElement.addEventListener('click', () => {
        if (waveStarted && !gameOver && !ui.buy.classList.contains('visible')) requestLock();
    });
    window.addEventListener('blur', () => { firing = false; keys = Object.create(null); });
    window.addEventListener('resize', resize);
}

function beginMatch() {
    waveStarted = true;
    ui.start.classList.remove('visible');
    startRound();
    requestLock();
}

function requestLock() {
    if (renderer.domElement.requestPointerLock) renderer.domElement.requestPointerLock();
}

function startRound() {
    gameOver = false;
    roundTransition = false;
    playerHealth = 100;
    playerArmor = Math.max(playerArmor, 0);
    camera.position.set(0, 1.7, 22);
    bots.forEach((bot) => scene.remove(bot.group));
    bots = [];
    const count = Math.min(3 + round, 8);
    for (let index = 0; index < count; index++) spawnBot(index, count);
    ui.message.textContent = `ROUND ${round}  /  ELIMINATE HOSTILES`;
    ui.message.classList.add('visible');
    window.setTimeout(() => ui.message.classList.remove('visible'), 2100);
    updateHud();
}

function spawnBot(index, count) {
    const group = new THREE.Group();
    const uniform = material(index % 2 ? 0x656c5a : 0x77705f);
    const vest = material(index % 2 ? 0x333c38 : 0x4c4941);
    const skin = material(0xb28a68);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.9, 0.42), vest);
    torso.position.y = 1.15;
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.68, 0.38), uniform);
    legs.position.y = 0.37;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), skin);
    head.position.y = 1.82;
    group.add(torso, legs, head);
    const angle = index / count * Math.PI * 2;
    group.position.set(Math.cos(angle) * 22, 0, Math.sin(angle) * 22 - 2);
    scene.add(group);
    bots.push({ group, parts: [torso, legs, head], health: 100, fireTimer: 0.5 + Math.random(), strafe: Math.random() < 0.5 ? -1 : 1, phase: Math.random() * 5, alive: true });
}

function animate(timestamp) {
    requestAnimationFrame(animate);
    const delta = Math.min((timestamp - lastFrame) / 1000 || 0, 0.05);
    lastFrame = timestamp;
    if (!paused && waveStarted && !gameOver && !ui.buy.classList.contains('visible')) {
        updatePlayer(delta);
        updateBots(delta);
        if (firing) shoot(timestamp);
        recoil = Math.max(0, recoil - delta * 1.8);
        camera.rotation.x = pitch - recoil;
    }
    const viewmodel = viewmodels[activeWeapon];
    if (viewmodel) {
        viewmodel.position.z = recoil * 0.35;
        viewmodel.rotation.x = -recoil * 0.5;
    }
    renderer.render(scene, camera);
}

function updatePlayer(delta) {
    const forwardInput = Number(keys.KeyW || keys.ArrowUp) - Number(keys.KeyS || keys.ArrowDown);
    const sideInput = Number(keys.KeyD) - Number(keys.KeyA);
    moving = forwardInput !== 0 || sideInput !== 0;
    crouching = Boolean(keys.ControlLeft || keys.ControlRight);
    const runModifier = keys.ShiftLeft && !crouching ? 1.24 : 1;
    const speed = (crouching ? 3.1 : 5.1) * runModifier;
    const length = Math.hypot(forwardInput, sideInput) || 1;
    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    const nextX = camera.position.x + (forwardX * forwardInput + rightX * sideInput) / length * speed * delta;
    const nextZ = camera.position.z + (forwardZ * forwardInput + rightZ * sideInput) / length * speed * delta;
    if (!collides(nextX, camera.position.z, 0.42)) camera.position.x = nextX;
    if (!collides(camera.position.x, nextZ, 0.42)) camera.position.z = nextZ;
    camera.position.x = Math.max(-33, Math.min(33, camera.position.x));
    camera.position.z = Math.max(-31, Math.min(31, camera.position.z));

    playerVelocityY -= 14 * delta;
    camera.position.y += playerVelocityY * delta;
    const floorHeight = crouching ? 1.05 : 1.7;
    if (camera.position.y <= floorHeight) {
        camera.position.y = floorHeight;
        playerVelocityY = 0;
        grounded = true;
    }
}

function collides(x, z, radius) {
    return solids.some((solid) => Math.abs(x - solid.x) < solid.halfX + radius && Math.abs(z - solid.z) < solid.halfZ + radius);
}

function updateBots(delta) {
    let living = 0;
    bots.forEach((bot) => {
        if (!bot.alive) return;
        living++;
        const dx = camera.position.x - bot.group.position.x;
        const dz = camera.position.z - bot.group.position.z;
        const distance = Math.hypot(dx, dz) || 1;
        const directionX = dx / distance;
        const directionZ = dz / distance;
        bot.phase += delta;
        const orbit = Math.sin(bot.phase * 1.3) * 0.55;
        const speed = distance > 12 ? 1.65 : 0.45;
        const nextX = bot.group.position.x + (directionX * speed - directionZ * orbit) * delta;
        const nextZ = bot.group.position.z + (directionZ * speed + directionX * orbit) * delta;
        if (!collides(nextX, nextZ, 0.55)) bot.group.position.set(nextX, 0, nextZ);
        bot.group.rotation.y = Math.atan2(-dx, -dz);
        if (distance < 29) {
            bot.fireTimer -= delta;
            if (bot.fireTimer <= 0 && hasLineOfSight(bot.group.position, camera.position)) {
                bot.fireTimer = 0.9 + Math.random() * 0.7;
                if (Math.random() < Math.max(0.18, 0.57 - distance * 0.012)) damagePlayer(7 + Math.floor(Math.random() * 5));
            }
        }
    });
    ui.botCount.textContent = `${living} HOSTILE${living === 1 ? '' : 'S'}`;
    if (living === 0 && !gameOver && !roundTransition) {
        roundTransition = true;
        round++;
        money += 3250;
        window.setTimeout(startRound, 1700);
    }
}

function hasLineOfSight(from, to) {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const distance = Math.hypot(dx, dz);
    const stepCount = Math.ceil(distance / 1.1);
    for (let step = 1; step < stepCount; step++) {
        const x = from.x + dx * step / stepCount;
        const z = from.z + dz * step / stepCount;
        if (solids.some((solid) => Math.abs(x - solid.x) < solid.halfX && Math.abs(z - solid.z) < solid.halfZ)) return false;
    }
    return true;
}

function shoot(timestamp) {
    const config = weapons[activeWeapon];
    const state = weaponState[activeWeapon];
    if (!config.automatic && firing) return;
    if (!config.automatic && timestamp - lastShot < config.fireRate * 1000) return;
    if (timestamp - lastShot < config.fireRate * 1000 || reloading) return;
    if (state.magazine <= 0) {
        reloadWeapon();
        return;
    }
    lastShot = timestamp;
    state.magazine--;
    recoil = Math.min(0.055, recoil + (activeWeapon === 'rifle' ? 0.013 : 0.022));
    camera.rotation.x = pitch - recoil;
    const spread = config.spread + (moving ? 0.012 : 0) + (crouching ? -0.004 : 0);
    raycaster.setFromCamera(new THREE.Vector2((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread), camera);
    const targets = bots.filter((bot) => bot.alive).flatMap((bot) => bot.parts);
    const hit = raycaster.intersectObjects(targets, false)[0];
    if (hit) {
        const bot = bots.find((candidate) => candidate.parts.includes(hit.object));
        if (bot) damageBot(bot, hit.object === bot.parts[2] ? config.damage * 2 : config.damage);
    }
    updateHud();
}

function damageBot(bot, amount) {
    bot.health -= amount;
    if (bot.health > 0) return;
    bot.alive = false;
    bot.group.visible = false;
    score++;
    money += 300;
    updateHud();
}

function damagePlayer(amount) {
    const absorbed = Math.min(playerArmor, Math.ceil(amount * 0.45));
    playerArmor -= absorbed;
    playerHealth = Math.max(0, playerHealth - (amount - absorbed));
    updateHud();
    if (playerHealth === 0) {
        gameOver = true;
        firing = false;
        document.getElementById('final-score').textContent = score;
        document.exitPointerLock?.();
        ui.dead.classList.add('visible');
    }
}

function reloadWeapon() {
    if (reloading) return;
    const state = weaponState[activeWeapon];
    const config = weapons[activeWeapon];
    if (!state || state.magazine === config.magazine || state.reserve === 0) return;
    reloading = true;
    firing = false;
    window.setTimeout(() => {
        const amount = Math.min(config.magazine - state.magazine, state.reserve);
        state.magazine += amount;
        state.reserve -= amount;
        reloading = false;
        updateHud();
    }, activeWeapon === 'rifle' ? 1900 : 1450);
}

function switchWeapon(name) {
    if (!weaponState[name]) return;
    activeWeapon = name;
    reloading = false;
    viewmodels.sidearm.visible = name === 'sidearm';
    viewmodels.rifle.visible = name === 'rifle';
    updateHud();
}

function toggleBuyMenu() {
    if (!waveStarted || gameOver) return;
    const open = !ui.buy.classList.contains('visible');
    ui.buy.classList.toggle('visible', open);
    firing = false;
    if (open) document.exitPointerLock?.();
    else requestLock();
}

function closeBuyMenu() {
    if (!ui.buy.classList.contains('visible')) return;
    ui.buy.classList.remove('visible');
    requestLock();
}

function purchase(item) {
    if (item === 'rifle') {
        const cost = weapons.rifle.cost;
        if (money < cost) return showMessage('NOT ENOUGH FUNDS');
        money -= cost;
        weaponState.rifle = { magazine: weapons.rifle.magazine, reserve: weapons.rifle.reserve };
        switchWeapon('rifle');
    } else if (item === 'armor') {
        if (money < 650) return showMessage('NOT ENOUGH FUNDS');
        if (playerArmor >= 100) return showMessage('ARMOR IS FULL');
        money -= 650;
        playerArmor = Math.min(100, playerArmor + 100);
    } else if (item === 'ammo') {
        const config = weapons[activeWeapon];
        const state = weaponState[activeWeapon];
        if (money < 300) return showMessage('NOT ENOUGH FUNDS');
        money -= 300;
        state.reserve += config.magazine * 2;
    }
    updateHud();
}

function showMessage(text) {
    ui.message.textContent = text;
    ui.message.classList.add('visible');
    window.setTimeout(() => ui.message.classList.remove('visible'), 1400);
}

function updateHud() {
    const state = weaponState[activeWeapon] || { magazine: weapons[activeWeapon].magazine, reserve: weapons[activeWeapon].reserve };
    ui.health.textContent = Math.ceil(playerHealth);
    ui.armor.textContent = playerArmor;
    ui.ammo.textContent = reloading ? 'RELOAD' : state.magazine;
    ui.reserve.textContent = state.reserve;
    ui.weapon.textContent = weapons[activeWeapon].name;
    ui.money.textContent = `$${money.toLocaleString()}`;
    document.getElementById('money-value-menu').textContent = `$${money.toLocaleString()}`;
    ui.score.textContent = String(score).padStart(2, '0');
    ui.round.textContent = String(round).padStart(2, '0');
    document.querySelectorAll('[data-buy]').forEach((button) => {
        button.classList.toggle('owned', button.dataset.buy === 'rifle' && Boolean(weaponState.rifle));
    });
}

function restartMatch() {
    round = 1;
    score = 0;
    money = 800;
    roundTransition = false;
    playerArmor = 0;
    weaponState = { sidearm: { magazine: weapons.sidearm.magazine, reserve: weapons.sidearm.reserve } };
    activeWeapon = 'sidearm';
    viewmodels.sidearm.visible = true;
    viewmodels.rifle.visible = false;
    ui.dead.classList.remove('visible');
    startRound();
    requestLock();
}

function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

weaponState.sidearm = { magazine: weapons.sidearm.magazine, reserve: weapons.sidearm.reserve };
init();