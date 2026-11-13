import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class LevelBuilder {
    constructor(scene, world, physicsMaterial, objectsToUpdate) {
        this.scene = scene;
        this.world = world;
        this.physicsMaterial = physicsMaterial;
        this.objectsToUpdate = objectsToUpdate;
    }

    build() {
        this.createFloor();
        
        // Paredes
        this.createWall(new CANNON.Vec3(0, 5, -20), new CANNON.Vec3(40, 10, 1), 0xf1f5f9);
        this.createWall(new CANNON.Vec3(0, 5, 20), new CANNON.Vec3(40, 10, 1), 0xf1f5f9);
        this.createWall(new CANNON.Vec3(-20, 5, 0), new CANNON.Vec3(1, 10, 40), 0xe2e8f0);
        this.createWall(new CANNON.Vec3(20, 5, 0), new CANNON.Vec3(1, 10, 40), 0xe2e8f0);
        
        // Mobília
        this.createWhiteboard(new CANNON.Vec3(0, 5, -19.4));
        this.createMachine(new CANNON.Vec3(-15, 2.5, -15), 0x334155, 0x10b981);
        this.createMachine(new CANNON.Vec3(15, 3.5, -15), 0x475569, 0xef4444);
        
        // Mesas de Trabalho
        this.createWorkbench(new CANNON.Vec3(-8, 1.5, -5), new CANNON.Vec3(8, 0.2, 3)); // Mesa Esquerda
        this.createWorkbench(new CANNON.Vec3(8, 1.5, -5), new CANNON.Vec3(8, 0.2, 3));  // Mesa Direita (Puzzle)
        this.createWorkbench(new CANNON.Vec3(0, 1.5, 5), new CANNON.Vec3(10, 0.2, 4));  // Mesa Central (Moléculas 3D)

        // Props e Interativos
        this.createFlask(new CANNON.Vec3(-9, 3, -5), 0x22c55e);
        this.createFlask(new CANNON.Vec3(7, 3, -5), 0x3b82f6);
        this.createExtinguisher(new CANNON.Vec3(-12, 3, -13));
        this.createExtinguisher(new CANNON.Vec3(12, 3, -13));
    }

    createFloor() {
        const canvasGrid = document.createElement('canvas');
        canvasGrid.width = canvasGrid.height = 128;
        const ctx = canvasGrid.getContext('2d');
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, 128, 128);
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, 128, 128);
        const floorTexture = new THREE.CanvasTexture(canvasGrid);
        floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping; floorTexture.repeat.set(30, 30);
        
        const floorBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: this.physicsMaterial });
        floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(floorBody);
        
        const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.2, metalness: 0.1 }));
        floorMesh.rotation.x = -Math.PI / 2; floorMesh.receiveShadow = true;
        this.scene.add(floorMesh);
    }

    createWall(position, size, color) {
        const body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)) });
        body.position.copy(position); this.world.addBody(body);
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), new THREE.MeshStandardMaterial({ color }));
        mesh.position.copy(position); mesh.receiveShadow = mesh.castShadow = true; this.scene.add(mesh);
    }

    createWorkbench(position, size) {
        const body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)) });
        body.position.copy(position); this.world.addBody(body);
        const top = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.2 }));
        top.position.copy(position); top.castShadow = top.receiveShadow = true; this.scene.add(top);
        const legGeo = new THREE.CylinderGeometry(0.1, 0.1, position.y * 2), legMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
        const lx = size.x / 2 - 0.2, lz = size.z / 2 - 0.2;
        [[-lx, lz], [lx, lz], [-lx, -lz], [lx, -lz]].forEach(([x, z]) => {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(position.x + x, position.y, position.z + z);
            leg.castShadow = true; this.scene.add(leg);
        });
    }

    createMachine(position, bodyColor, lightColor) {
        const size = new CANNON.Vec3(3, position.y * 2, 3);
        const body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)) });
        body.position.copy(position); this.world.addBody(body);
        const group = new THREE.Group(); group.position.copy(position);
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.6, roughness: 0.4 }));
        mesh.castShadow = mesh.receiveShadow = true;
        const light = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.5), new THREE.MeshStandardMaterial({ color: lightColor, emissive: lightColor, emissiveIntensity: 2 }));
        light.position.set(0, size.y / 4, size.z / 2 + 0.01);
        group.add(mesh, light); this.scene.add(group);
    }

    createWhiteboard(position) {
        const board = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 0.1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 }));
        const frame = new THREE.Mesh(new THREE.BoxGeometry(10.2, 4.2, 0.05), new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.8 }));
        board.position.copy(position); frame.position.set(position.x, position.y, position.z - 0.05);
        this.scene.add(board, frame);
    }

    createFlask(position, hexColor) {
        const body = new CANNON.Body({ mass: 1, material: this.physicsMaterial, linearDamping: 0.1, angularDamping: 0.4 });
        body.addShape(new CANNON.Sphere(0.4)); body.addShape(new CANNON.Cylinder(0.15, 0.15, 0.6, 16), new CANNON.Vec3(0, 0.5, 0));
        body.position.copy(position); this.world.addBody(body);
        const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, opacity: 1, roughness: 0.1, ior: 1.5, thickness: 0.5 });
        const liquidMat = new THREE.MeshStandardMaterial({ color: hexColor, roughness: 0.2, transparent: true, opacity: 0.9 });
        const baseMesh = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 32), glassMat); baseMesh.castShadow = true;
        const liquidMesh = new THREE.Mesh(new THREE.SphereGeometry(0.36, 32, 32), liquidMat); liquidMesh.position.y = -0.04;
        const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.6, 32), glassMat); neckMesh.position.y = 0.5; neckMesh.castShadow = true;
        const group = new THREE.Group(); group.add(baseMesh, liquidMesh, neckMesh); this.scene.add(group);
        group.userData.physicsBody = body; this.objectsToUpdate.push({ mesh: group, body });
    }

    createExtinguisher(position) {
        const body = new CANNON.Body({ mass: 4, material: this.physicsMaterial, linearDamping: 0.1, angularDamping: 0.4 });
        body.addShape(new CANNON.Cylinder(0.3, 0.3, 1.2, 16)); body.position.copy(position); this.world.addBody(body);
        const group = new THREE.Group();
        const bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.2, 32), new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.4 })); bodyMesh.castShadow = true;
        const nozzleGroup = new THREE.Group(); nozzleGroup.position.y = 0.7;
        const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 16), blackMat);
        const nozzle = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.5), blackMat); nozzle.position.z = -0.25;
        nozzleGroup.add(neck, nozzle); group.add(bodyMesh, nozzleGroup); this.scene.add(group);
        Object.assign(body, { isExtinguisher: true, nozzleMesh: nozzle, graphicsGroup: group });
        group.userData.physicsBody = body; this.objectsToUpdate.push({ mesh: group, body });
    }
}