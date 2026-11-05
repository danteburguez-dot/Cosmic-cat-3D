# COSMIC CAT — Aventura espacial 3D

Juego 3D con gato astronauta, perros alienígenas, élites y jefes, ocho planetas, minimapa, mejoras, piezas de cohete y sonido generado en tiempo real.

## Contenido

- **web/** — versión navegador (PWA). Se ejecuta con Live Server o cualquier servidor estático.
- **windows/** — ejecutable portable para Windows (doble clic).
- **android/** — APK para instalar en teléfonos Android.
- **engine.cpp** — código C++ de la lógica de juego compilada a WebAssembly.
- **.github/workflows** — compilación automática de EXE y APK.

## Cómo jugar en el navegador

1. Abre `web/index.html` con Live Server de Visual Studio Code (o cualquier servidor estático).
2. Pulsa **COMENZAR**. Al hacerlo se pregunta:
   - Si juegas en PC o teléfono.
   - En teléfono: flechitas o joystick.

## Controles de PC

- 🟦 WASD/flechas: caminar.
- 🟦 Mouse: mirar y apuntar.
- 🟦 Clic izquierdo: cola.
- 🟦 Clic derecho: meteorito.
- 🟦 Espacio: disparo.
- 🟦 J: cola.
- 🟦 Shift: correr.
- 🟦 Esc: pausa.

## Controles de teléfono

- D-pad flechitas o joystick virtual.
- Botones CORRER, COLA, METEORITO y COHETE (en gigantes gaseosos).

## Instalación desde el juego

El botón **Windows / Android** de la pantalla inicial permite descargar el ejecutable de Windows o el APK de Android.

## Compilación

- **Windows EXE:** en `desktop/` ejecuta `npm install` y luego `npm run dist`.
- **Android APK:** en `android/` ejecuta `npm install`, `npx cap add android`, `npx cap copy android` y luego `gradlew assembleDebug` en `android/android`.

La acción de GitHub `Build releases` empaqueta ambas versiones automáticamente.
