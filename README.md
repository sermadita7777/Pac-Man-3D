# Labyrinth of Whispers 🕹️💀

Pac-Man reimaginado como un **survival horror en primera persona**. Recorre un laberinto oscuro armado solo con una linterna degradable, gestiona tu estamina para huir, evita las trampas de cadenas y sobrevive al acecho del Shadow Ghost.

## 🌑 Características v1.5 (Horror Overhaul)

### Gameplay de Supervivencia
- **Primera persona 3D** — Perspectiva FPS inmersiva con Three.js y post-procesado (bloom, vignette, scanlines).
- **Stamina System (Barra Dorada)** — El sprint se agota y requiere gestión estratégica. Tarda 1s en regenerarse tras el uso. Si se vacía, debes esperar a recuperar un 20% para volver a correr.
- **Linterna Degradable (Barra Azul)** — Fuente de luz limitada (~66s). Recárgala comiendo bolitas (+3%) o cazando fantasmas (+50%). Por debajo del 30%, la luz parpadea de forma inestable. A 0%, oscuridad casi total.
- **Trampas de Cadenas** — 10 zonas marcadas con un brillo rojo tenue. Al pisarlas: sonido metálico, ralentización al 35% de velocidad por 1.5s y atracción de fantasmas (radio 8) hacia la trampa durante 3s. Cooldown de 12s.

### Atmósfera de Terror
- **Escrituras de Sangre** — 14 mensajes dinámicos ("RUN", "BEHIND YOU", "IT SEES YOU") que aparecen/desaparecen con fade según tu proximidad (<5 celdas) y un efecto de respiración.
- **Zonas de Reflejo (Espejo)** — 8 zonas donde al pasar aparece brevemente una silueta oscura + sonido de succión invertida + static burst. Cooldown de 25s por zona.
- **Shadow Ghost (Stalker)** — Un 5º fantasma especial que se materializa si te quedas quieto más de 3 segundos. Se hace visible gradualmente (2.5s) con ojos magenta y glitch visual. Se desvanece al moverte.
- **Sonido Ambiente Adaptativo** — Drones graves, heartbeat que se acelera con la proximidad de fantasmas, susurros y gritos aleatorios.

## 🛠️ Estructura del Proyecto

```text
pacman3d/
├── src/
│   ├── core/
│   │   ├── game.js          # Game loop y máquina de estados (6 fases)
│   │   ├── audio.js         # Web Audio API: chomp, death, ambient, whispers
│   │   ├── input.js         # Teclado + pointer lock
│   │   └── renderer.js      # Three.js renderer, cámara FPS, post-procesado
│   ├── entities/
│   │   ├── player.js        # Movimiento grid-based, linterna, sprint, stamina
│   │   ├── ghost.js         # IA: chase/scatter/frightened/eaten, pathfinding
│   │   ├── traps.js         # Trampas de suelo (ralentización + atracción)
│   │   ├── wallWritings.js  # Mensajes de sangre con canvas texture
│   │   ├── mirrorScare.js   # Zonas de susto visual/auditivo
│   │   └── stalkerGhost.js  # 5º fantasma (aparición por inactividad)
│   ├── systems/
│   │   ├── collision.js     # Detección pellet-player y ghost-player
│   │   ├── pathfinding.js   # A* pathfinding sobre el grid
│   │   └── particles.js     # Sistema de partículas para efectos
│   └── ui/
│       ├── hud.js           # Score, vidas, stamina, batería, minimapa
│       └── screens.js       # Pantallas: start, game over, level complete
├── index.html               # Punto de entrada
└── styles.css               # Estilos de HUD, scanlines y vignette
```

## 🚀 Cómo Jugar

1. **Clonar**: `git clone https://github.com/sermadita7777/Pac-Man-3D.git`
2. **Servidor Local**: Requiere un servidor (ej: *Live Server* de VS Code, `npx serve .` o `python -m http.server`).
3. **Controles**:
   - **WASD / Flechas**: Mover.
   - **Ratón**: Mirar alrededor (Click para capturar cursor).
   - **SHIFT**: Sprint.
   - **ENTER**: Iniciar / Reiniciar.

## 🧪 Detalles Técnicos

### Arquitectura & IA
- **IA de Fantasmas**: Pathfinding A* recalculado periódicamente con estados Chase, Scatter, Frightened y Eaten. Velocidad y agresividad escaladas por nivel.
- **Audio Procedural**: Todo el audio es generado en runtime sin archivos externos mediante **Web Audio API** (osciladores, filtros, reverb por convolución).
- **Post-procesado**: Bloom, vignette oscuro y scanlines CRT aplicados mediante CSS3 y Shaders para un ambiente retro-horror.

---
¡Sobrevive al laberinto de susurros! 🕯️💀
