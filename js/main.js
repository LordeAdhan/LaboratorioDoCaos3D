import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Módulos
import { DatabaseManager } from './DatabaseManager.js';
import { GameSetup } from './GameSetup.js';
import { MoleculeRenderer } from './MoleculeRenderer.js';
import { PuzzleManager } from './PuzzleManager.js';
import { LevelBuilder } from './LevelBuilder.js';

// Variáveis Globais
let camera, scene, renderer, controls, world;
let playerBody, rightArm, leftArm, physicsMaterial, slipperyMaterial;
let heldBodyRight = null, heldBodyLeft = null;

const timeStep = 1 / 60;
let lastCallTime = performance.now() / 1000;

// Estado e Controles do Jogador
const gameState = { currentMolecule: null, objectsToUpdate: [], isGrounded: false };
const keys = { w: false, a: false, s: false, d: false, space: false, shift: false };
const playerDirection = new THREE.Vector3();
const recoilVel = new THREE.Vector3();
const raycaster = new THREE.Raycaster();

// Partículas do Extintor
const particles = [];
const particleGeo = new THREE.BoxGeometry(0.4, 0.4, 0.05), particleMat = new THREE.MeshBasicMaterial({ color: 0x0088ff });
const whiteParticleGeo = new THREE.BoxGeometry(0.15, 0.15, 0.05), whiteParticleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

init();
animate();

async function init() {
    setupGraphics();
    setupPhysics();
    setupPlayerAndControls();

    // Constrói o cenário usando o novo módulo
    const level = new LevelBuilder(scene, world, physicsMaterial, gameState.objectsToUpdate);
    level.build();

    // Inicializa Módulos do Jogo
    const dbManager = new DatabaseManager();
    const setup = new GameSetup(controls);
    const moleculeRenderer = new MoleculeRenderer(scene);
    const puzzleManager = new PuzzleManager(scene, world, gameState.objectsToUpdate);

    setup.onPlayClicked(async (difficulty) => {
        setup.showLoading(true);
        const moleculeData = await dbManager.fetchRandomMolecule(difficulty);
        gameState.currentMolecule = moleculeData;
        
        moleculeRenderer.renderOnCenterTable(moleculeData);
        puzzleManager.generatePuzzlePieces(moleculeData.iupac_name);
        
        setup.showLoading(false);
        controls.lock();
    });

    window.addEventListener('resize', onWindowResize);
}

function setupGraphics() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 0, 50);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    const dirLight = new THREE.DirectionalLight(0xe0f7fa, 0.7);
    dirLight.position.set(10, 20, 10); 
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
}

function setupPhysics() {
    world = new CANNON.World({ gravity: new CANNON.Vec3(0, -15, 0) });
    world.broadphase = new CANNON.SAPBroadphase(world);
    
    physicsMaterial = new CANNON.Material("standard");
    slipperyMaterial = new CANNON.Material("slippery");
    world.addContactMaterial(new CANNON.ContactMaterial(physicsMaterial, physicsMaterial, { friction: 0.3, restitution: 0.1 }));
    world.addContactMaterial(new CANNON.ContactMaterial(slipperyMaterial, physicsMaterial, { friction: 0.0, restitution: 0.1 }));
}

function setupPlayerAndControls() {
    // Corpo do Jogador
    playerBody = new CANNON.Body({ mass: 50, shape: new CANNON.Sphere(1.5), material: slipperyMaterial, fixedRotation: true });
    playerBody.position.set(0, 5, 10); 
    playerBody.linearDamping = 0.0;
    world.addBody(playerBody);

    // Braços
    function createArm(isLeft) {
        const armGroup = new THREE.Group(), sign = isLeft ? -1 : 1;
        const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
        armMesh.position.set(0, 0, -0.5); armMesh.castShadow = true;
        const handMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.4), new THREE.MeshStandardMaterial({ color: 0x87cefa, roughness: 0.5 }));
        handMesh.position.set(0, 0, -1.6); handMesh.castShadow = true;
        armGroup.add(armMesh, handMesh);
        armGroup.position.set(0.6 * sign, -0.5, -0.5);
        armGroup.rotation.set(0.2, 0.2 * -sign, 0);
        armGroup.visible = false;
        return armGroup;
    }
    camera.add(rightArm = createArm(false));
    camera.add(leftArm = createArm(true));

    controls = new PointerLockControls(camera, document.body);
    scene.add(controls.getObject());

    // Eventos de Teclado
    const keyMap = { 'KeyW': 'w', 'KeyA': 'a', 'KeyS': 's', 'KeyD': 'd', 'ShiftLeft': 'shift', 'ShiftRight': 'shift' };
    document.addEventListener('keydown', (e) => {
        if (keyMap[e.code]) keys[keyMap[e.code]] = true;
        if (e.code === 'Space' && gameState.isGrounded) { playerBody.velocity.y = 8; gameState.isGrounded = false; }
    });
    document.addEventListener('keyup', (e) => { if (keyMap[e.code]) keys[keyMap[e.code]] = false; });
    document.addEventListener('contextmenu', e => e.preventDefault());

    // Eventos de Mouse (Pegar Objetos)
    document.addEventListener('mousedown', (e) => {
        if (!controls.isLocked || (e.button !== 0 && e.button !== 2)) return;
        const isLeft = e.button === 0;
        if (isLeft) leftArm.visible = true; else rightArm.visible = true;
        
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        for (let { object: obj, distance } of raycaster.intersectObjects(scene.children, true)) {
            let body = obj.userData.physicsBody;
            while (obj.parent && !body) { obj = obj.parent; body = obj.userData.physicsBody; }
            if (body && body.mass > 0 && distance < 6 && body !== heldBodyRight && body !== heldBodyLeft) {
                body.wakeUp(); body.angularVelocity.set(0, 0, 0);
                if (isLeft) heldBodyLeft = body; else heldBodyRight = body;
                break;
            }
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (e.button === 0) { heldBodyLeft = null; leftArm.visible = false; } 
        else if (e.button === 2) { heldBodyRight = null; rightArm.visible = false; }
    });
}

function applySpringForce(body, offsetX) {
    if (!body) return;
    const targetPos = new THREE.Vector3(offsetX, -0.5, -2.5).applyMatrix4(camera.matrixWorld);
    body.velocity.set((targetPos.x - body.position.x) * 12, (targetPos.y - body.position.y) * 12, (targetPos.z - body.position.z) * 12);
    body.angularVelocity.set(0, 0, 0); body.quaternion.copy(camera.quaternion);
}

function emitParticles(body, dt) {
    if (!body?.isExtinguisher) return;
    const nozzlePos = new THREE.Vector3(), dir = new THREE.Vector3(0, 0, -1).applyQuaternion(body.graphicsGroup.quaternion);
    body.nozzleMesh.getWorldPosition(nozzlePos);
    for (let i = 0; i < 3; i++) {
        const isWhite = Math.random() > 0.7;
        const p = new THREE.Mesh(isWhite ? whiteParticleGeo : particleGeo, isWhite ? whiteParticleMat : particleMat);
        p.position.copy(nozzlePos);
        p.userData = { life: 1.0, velocity: dir.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5)).normalize().multiplyScalar(15 + Math.random() * 5) };
        scene.add(p); particles.push(p);
    }
    recoilVel.x -= dir.x * 0.5; recoilVel.z -= dir.z * 0.5; playerBody.velocity.y -= dir.y * 0.6;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    const time = performance.now() / 1000;
    const dt = Math.min(time - lastCallTime, 0.05);
    lastCallTime = time;

    // Movimentação do Jogador
    if (controls.isLocked) {
        playerDirection.set((keys.a ? -1 : 0) + (keys.d ? 1 : 0), 0, (keys.w ? -1 : 0) + (keys.s ? 1 : 0)).normalize();
        const isRunning = keys.shift && playerDirection.lengthSq() > 0, moveSpeed = isRunning ? 18 : 10, targetFov = isRunning ? 85 : 75;
        if (Math.abs(camera.fov - targetFov) > 0.05) { camera.fov += (targetFov - camera.fov) * 0.1; camera.updateProjectionMatrix(); }
        
        const camDir = new THREE.Vector3(); camera.getWorldDirection(camDir); camDir.y = 0; camDir.normalize();
        const camRight = new THREE.Vector3().crossVectors(camera.up, camDir).normalize();

        if (playerDirection.lengthSq() > 0) {
            const moveVec = new THREE.Vector3().addScaledVector(camDir, -playerDirection.z).addScaledVector(camRight, -playerDirection.x);
            playerBody.velocity.x = moveVec.x * moveSpeed + recoilVel.x; playerBody.velocity.z = moveVec.z * moveSpeed + recoilVel.z;
        } else {
            playerBody.velocity.x = recoilVel.x; playerBody.velocity.z = recoilVel.z;
        }
        recoilVel.multiplyScalar(0.92);

        gameState.isGrounded = world.contacts.some(c => (c.bi === playerBody && -c.ni.y > 0.5) || (c.bj === playerBody && c.ni.y > 0.5));
        
        // Aplica física aos objetos segurados e extintor
        applySpringForce(heldBodyRight, 0.8); 
        applySpringForce(heldBodyLeft, -0.8);
        emitParticles(heldBodyLeft, dt); 
        emitParticles(heldBodyRight, dt);
    }

    world.step(timeStep, dt, 3);
    camera.position.set(playerBody.position.x, playerBody.position.y + 0.5, playerBody.position.z);

    // Sincroniza física com gráficos
    gameState.objectsToUpdate.forEach(({ mesh, body }) => { mesh.position.copy(body.position); mesh.quaternion.copy(body.quaternion); });

    // Atualiza Partículas
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.position.addScaledVector(p.userData.velocity, dt); p.userData.velocity.y -= 8 * dt;
        p.rotation.x += dt * 8; p.rotation.y += dt * 8; p.userData.life -= dt; p.scale.setScalar(Math.max(0, p.userData.life));
        if (p.userData.life <= 0) { scene.remove(p); particles.splice(i, 1); }
    }

    // Puzzle Check (Módulo 4)
    if (gameState.currentMolecule) {
        PuzzleManager.checkWinCondition(gameState.objectsToUpdate);
    }

    renderer.render(scene, camera);
}