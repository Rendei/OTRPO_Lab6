import * as THREE from 'three';
import { Node, Relationship, NodeData } from './Node';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Инициализация сцены и камеры
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let controls: OrbitControls;
let nodesMap = new Map<number, Node>();
let raycaster: THREE.raycaster; 
let mouse: THREE.Vector2;
let nodesData: NodeData[] = [];
let relationshipsData: Relationship[] = [];
let lines: THREE.Line[] = [];
let nodesCount = 200;

function initScene() {
  scene = new THREE.Scene();

  // Настройка камеры
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 50);

  // Настройка рендера
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Добавляем свет
  const light = new THREE.AmbientLight(0xf0f0f0);
  scene.add(light);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  scene.add(directionalLight);

  // Для отображения информации об узле
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Настройка OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // Дампинг для плавного управления
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 10;
  controls.maxDistance = 100;
  controls.maxPolarAngle = Math.PI;

  // Анимация и рендеринг сцены
  function animate() {
    requestAnimationFrame(animate);

    // Обновляем контроллеры в каждом кадре
    controls.update();

    renderer.render(scene, camera);
  }

  animate();
}

// Функция для загрузки всех узлов 
async function loadAllNodes() {
    try {
        const response = await fetch('http://127.0.0.1:8000/nodes');
        nodesData = await response.json();
        // createAllRelationships(scene);
    }
    catch (error) {
        console.error("Ошибка загрузки узлов:", error);
    }
}

// Функция для загрузки всех отношений
async function loadAllRelationships() {
  try {
      const response = await fetch('http://127.0.0.1:8000/relationships');  // Эндпоинт для получения всех связей
      relationshipsData = await response.json();
  } catch (error) {
      console.error("Ошибка загрузки связей:", error);
      return [];
  }
}

// Функция для очистки всех текущих связей (линий)
function clearAllRelationships(scene: THREE.Scene) {
  lines.forEach((line) => scene.remove(line));
  lines = [];
}

// Функция для создания всех связей между узлами
async function createAllRelationships(scene: THREE.Scene) {
    clearAllRelationships(scene);

    relationshipsData.forEach((relationship) => {
      const startNodeData = relationship.start_node_id;
      const endNodeData = relationship.end_node;

      // Проверяем, что узлы созданы
      const startNode = nodesMap.get(startNodeData);
      const endNode = nodesMap.get(endNodeData.id);

      if (startNode && endNode) {
          const relationshipType = relationship.relationship_type;
          startNode.addRelationship(endNode, relationshipType);

          // Создаем линию между узлами
          const lineGeometry = new THREE.BufferGeometry().setFromPoints([
              startNode.position,
              endNode.position,
          ]);
          const color = relationshipType === "SUBSCRIBED" ? 0xff0000 : 0x00ff00;
          const lineMaterial = new THREE.LineBasicMaterial({ color: color });
          const line = new THREE.Line(lineGeometry, lineMaterial);

          // Добавляем линию в сцену и массив для последующего удаления
          scene.add(line);
          lines.push(line);
      }
  });
}


// Функция отображения информации об узле
function displayNodeInfo(node: Node) {
  const infoDiv = document.getElementById('info')!;
  const relationshipsHTML = node.relationships.map((relationship) => {
    const endNodeName = relationship.end_node.name || "Неизвестный узел";
    return `<li><strong>${relationship.relationship_type}:</strong> ${endNodeName}</li>`;
  }).join("");

  infoDiv.innerHTML = `
      <p><strong>ID:</strong> ${node.id}</p>
      <p><strong>Label:</strong> ${node.label}</p>
      <p><strong>Name:</strong> ${node.name}</p>
      <p><strong>Relationships:</strong></p>
      <ul>${relationshipsHTML}</ul>
  `;
}

function updateLayout(layoutType: string) {
  const layoutLabel = document.getElementById('layoutLabel');
  layoutLabel!.innerText = layoutType === "0" ? "Случайное" : "Сферическое";

  // Удаляем узлы из сцены
  nodesMap.forEach((node) => {
      scene.remove(node.mesh);
  });
  nodesMap.clear();

  // Вызов соответствующего метода для нового расположения
  if (layoutType === "0") {
      arrangeNodesRandomly();
      createAllRelationships(scene);
  } else {
      arrangeNodesOnSphere();
      createAllRelationships(scene);
  }
}

function arrangeNodesRandomly() {
  nodesData.slice(0, nodesCount).forEach((nodeData: any) => {
      const position = new THREE.Vector3(
          (Math.random() - 0.5) * 50,
          (Math.random() - 0.5) * 50,
          (Math.random() - 0.5) * 50
      );
      const node = new Node(nodeData, position);
      node.addToScene(scene);
      node.mesh.callback = async () => displayNodeInfo(node);
      nodesMap.set(nodeData.id, node);
  });
}

// Функция для сферического распределения узлов
function arrangeNodesOnSphere() {
  const radius = 30;
  const totalNodes = nodesCount;

  nodesData.slice(0, nodesCount).forEach((nodeData: any, index: number) => {
      const theta = Math.acos(1 - 2 * (index + 0.5) / totalNodes); // Полярный угол
      const phi = Math.PI * (1 + Math.sqrt(5)) * index; // Азимутальный угол

      const x = radius * Math.sin(theta) * Math.cos(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(theta);

      const position = new THREE.Vector3(x, y, z);
      const node = new Node(nodeData, position);
      node.addToScene(scene);
      node.mesh.callback = async () => displayNodeInfo(node);
      nodesMap.set(nodeData.id, node);
  });
}

async function main() {
  await loadAllNodes();
  initScene();
  const layoutSwitch = document.getElementById("layoutSwitch") as HTMLInputElement;
  await loadAllRelationships();
  updateLayout(layoutSwitch.value);
}

// Глобальный доступ к функции
(window as any).updateLayout = updateLayout;

// Запуск всей сцены
document.addEventListener("DOMContentLoaded", () => {
  
});

main();

window.addEventListener('click', (event) => {
    // Рассчитываем положение мыши в нормализованном устройстве координат (от -1 до 1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Обновляем raycaster с координатами мыши
    raycaster.setFromCamera(mouse, camera);

    // Проверяем пересечения с узлами
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
        const intersectedNode = intersects[0].object;

        // Проверяем, есть ли у узла callback функция
        if (intersectedNode.callback) {
            intersectedNode.callback();
        }
    }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
