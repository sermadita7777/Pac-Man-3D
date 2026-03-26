# Pac-Man 3D 🕹️

Un motor de juego recreado en 3D del clásico Pac-Man, desarrollado con JavaScript.

## Características

- **Renderizado 3D**: Experiencia inmersiva utilizando Three.js
- **IA de Fantasmas**: Sistema de pathfinding dinámico para la persecución.
- **Arquitectura Basada en Sistemas**: Separación clara entre lógica de colisiones, movimiento y renderizado.
- **Audio Espacial**: Efectos de sonido integrados para una experiencia retro completa.
- **Minimapa**: HUD en tiempo real para control de posición.

## Estructura del Proyecto

```text
pacman3d/
├── src/
│   ├── core/         # Motores principales: Juego, Audio, Input, Render.
│   ├── data/         # Configuración y layouts de los laberintos.
│   ├── entities/     # Definición de objetos (Player, Ghost, Pellet, Maze).
│   ├── systems/      # Lógica pura: Colisiones y Pathfinding.
│   └── ui/           # Interfaz de usuario, HUD y pantallas de menú.
├── index.html        # Punto de entrada.
└── styles.css        # Estilos base.
```

## Tecnologías

- **Lenguaje**: JavaScript (ES6+).
- **Gráficos**: WebGL / Three.js.
- **Estilos**: CSS3.

## Cómo Jugar

1. Clona el repositorio:
   ```bash
   git clone https://github.com/sermadita7777/Pac-Man-3D.git
   ```
2. Abre `index.html` en tu navegador (se recomienda usar un servidor local como *Live Server*), necesita un servidor local por los ES modules). La forma más rápida:
   - cd pacman3d
   - npx serve .
   - O con Python: python -m http.server 8000
3. Controles:

- WASD / Flechas — Mover
- SHIFT — Sprint
- ENTER — Iniciar / Reiniciar

## Detalles Técnicos

El proyecto utiliza un enfoque de **Programación Orientada a Objetos** combinado con un **Patrón de Sistemas**:
- **Collision System**: Gestiona las interacciones entre Pac-Man, los muros y los fantasmas.
- **Pathfinding**: Los fantasmas calculan la ruta más corta hacia el jugador o sus nodos de patrulla.

---

¡Disfruta jugando