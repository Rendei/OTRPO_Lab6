import * as THREE from 'three';

// Определение интерфейса для связи
export interface Relationship {
    start_node_id: number;
    relationship_type: string;
    end_node: NodeData;
}

// Данные для узла на основе возвращаемой структуры
interface NodeData {
    id: number;
    label: string;
    name?: string;
    screen_name?: string;
    sex?: number;
    city?: string;
}

// Класс Node
export class Node {
    id: number;
    label: string;
    name?: string;
    screenName?: string;
    sex?: number;
    city?: string;
    relationships: Relationship[];
    position: THREE.Vector3;
    mesh: THREE.Mesh;

    constructor(data: NodeData, position: THREE.Vector3) {
        this.id = data.id;
        this.label = data.label;
        this.name = data.name;
        this.screenName = data.screen_name;
        this.sex = data.sex;
        this.city = data.city;
        this.position = position;
        this.relationships = []
        const geometry = new THREE.SphereGeometry(1, 32, 32);
        const material = new THREE.MeshStandardMaterial({ color: this.getNodeColor()  });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.name = this.id;
    }

    // Устанавливаем цвет в зависимости от типа узла
    private getNodeColor(): number {
        return this.label === 'User' ? new THREE.Color(0x1f78b4) : new THREE.Color(0x33a02c);
    }

    // Метод для добавления связи к узлу
    addRelationship(endNode: Node, relationshipType: string) {
        this.relationships.push({ relationship_type: relationshipType, end_node: endNode });
    }
    
    // Добавление узла на сцену
    addToScene(scene: THREE.Scene) {
        scene.add(this.mesh);
    }
}
