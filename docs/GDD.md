# GOM Pizza Delivery — Documento de Diseño de Juego (GDD)

> **Versión:** 1.0 · **Estado:** prototipo jugable (Android APK + Web)
> **Género:** arcade de conducción · *infinite runner* con reparto por *timing*
> **Plataformas:** Android (objetivo principal, horizontal), navegador (HTML5). Futuro: iOS, Steam Deck.
> **Público:** a partir de 7 años (PEGI 7) · jugador casual-core · sesiones de 2 a 6 minutos
> **Estilo:** pixel art 16 bits, vibrante, a 270 píxeles lógicos de alto

---

## 0. Resumen ejecutivo

**Pitch en una línea:** *GOM, la jirafa motera más rápida de Ciudad Porción, recorre una avenida infinita
que atraviesa barrios cambiantes lanzando pizzas al milímetro mientras esquiva un tráfico caótico.*

El brief original planteaba niveles cerrados con meta. Esta versión lo reconstruye **desde la base como
un *infinite runner* totalmente infinito y aleatorio**: la avenida nunca termina, cada partida usa una
semilla nueva y el mundo se genera por tramos sobre la marcha. Las cuatro fases del brief (recarga,
conducción, entrega y evaluación) no desaparecen: se convierten en un **ciclo que se repite dentro de la
partida infinita** gracias a las *Pizzerías de Recarga* que aparecen periódicamente.

### Pilares de diseño

| # | Pilar | Qué significa en la práctica |
|---|-------|------------------------------|
| 1 | **Velocidad legible** | Frenético, pero todo peligro se anuncia (faros, intermitentes, «!», burbujas, sombras). Si chocas, sabes por qué. |
| 2 | **El lanzamiento perfecto** | La entrega por *timing* es el corazón: fácil de hacer, difícil de clavar siempre en PERFECTO. |
| 3 | **Riesgo = recompensa** | Casi-choques, carril contrario, rampas y furgonetas rivales dan más puntos, turbo y tiempo. |
| 4 | **Una partida más** | Partidas cortas, progreso visible en cada una, sorpresa procedural en cada tramo. |
| 5 | **Encanto pixel** | GOM tiene personalidad (6 expresiones), la ciudad está viva y cada barrio se ve y suena distinto. |

---

## 1. Premisa, personaje y estilo visual

### 1.1 Premisa
Ciudad Porción vive pegada al móvil y a la pizza. La **Pizzería GOM** promete «caliente o gratis», y su
repartidor estrella, **GOM**, no piensa regalar ni una. Su archienemiga es la cadena low-cost
**Pizza Rápida**, cuyas furgonetas rojas intentan robarle los pedidos por el camino.

### 1.2 GOM (protagonista)
- Jirafa antropomórfica con **actitud motera**: casco amarillo con los osiconos asomando, gafas de sol
  azules, chaqueta y guantes negros, moto deportiva amarilla y caja térmica con el logo de la pizza.
- Personalidad: chulito pero entrañable; nunca se rinde. Su cuello largo es parte del humor
  (asoma por encima del tráfico, se agacha en los saltos).
- **Retrato en el HUD** con 6 expresiones (de la hoja de concepto) que reaccionan al juego:
  neutra, sonrisa, guiño/lengua (PERFECTO), concentración (Fever), sorpresa (casi-choque) y enfado (choque).

### 1.3 Dirección de arte
- **Pixel art 16 bits** con contorno oscuro azulado (`#120C1E`) y 2–3 tonos por material.
- **Resolución lógica:** 270 px de alto; el ancho se adapta a la pantalla (entre 16:9 y 21:9, 480–640 px)
  y se escala con vecino más próximo para mantener el píxel nítido.
- **Paleta base:** amarillo GOM `#F5B800`, negro azulado `#1B1B2F`, naranjas y rosas de atardecer,
  magentas y cianes neón, turquesas de tormenta.
- **Perspectiva 2.5D tipo *beat 'em up*** (Final Fight / Streets of Rage): avenida de 4 carriles con
  profundidad en el eje Y, ordenación por profundidad (*y-sort*) y sombras elípticas bajo cada objeto.
- **Parallax de 5 capas:** cielo (degradado + sol/luna + rayos), nubes, skyline lejano, skyline medio y
  fachadas a pie de acera; delante, carretera y atrezo en primer plano.
- **Iluminación:** capa de oscuridad por barrio + luces aditivas (farolas, neones, faros, relámpagos) y
  reflejos en el asfalto mojado.

### 1.4 Tono y humor
El juego se toma en serio la jugabilidad y **nada en serio todo lo demás**. El humor es parte de la
identidad y aparece en cada capa, siempre apto para todos los públicos:

| Dónde | Ejemplos |
|-------|----------|
| **Marcas de pizza paródicas** (fachadas especiales) | **Pizza Rápida** («¡30 min… o 3 días!», su neón tiene una letra rota que parpadea), **Domínguez** («solo abrimos domingos»), **Pizza Jat** («se escribe como suena»), **Papá Jonás** («como la de mamá»), **La Nonna** («enfadada desde 1952»), **Telefunghi** («llame y espere sentado»), **Pizza Nostra** («una oferta irrechazable»), **Margarito** («más queso que pizza») |
| **Tiendas del barrio** | Pan Comido, Flores y Rencores, El Tornillo Flojo, Cero Carbos Gym, Autoescuela Frenazo, Farmacia 23H, Tinte y Tinto, Churros Porras… |
| **Neones del Distrito Neón** | Sushi o No Sushi, Karaoke Desafina2, Ramen-Tiras, Wifi Gratis*, Hotel 5★*, 24H (casi), Kebab Espacial… |
| **Vallas publicitarias** | «¿Pizza fría? ¡Llama a GOM!», «La dieta empieza el lunes», «Seguros "Choqué otra vez"», «Match-zarella, la app de citas», «Bufandas XXXL para cuellos largos», «Hawaiana: la pizza de la discordia» |
| **Señales de tráfico** | «Jirafas cruzando», «Límite: lo que aguante la pizza», «Obras: no nos perdonen», «Zombis del móvil», «Gaviotas ladronas», «Prohibido aparcar jirafas», «Olas con mala leche» (aparecen justo antes del peligro que anuncian) |
| **Personajes** | Clientes que celebran («¡De cuello!», «¡Ni se ha movido el queso!») o se quejan («Llamo a Pizza Rápida», «Cenaré cereales…»); peatones que no levantan la vista del móvil («¡99 mensajes!», «¿Hay wifi?»); la furgoneta rival que presume («¡Aparta, jirafa!»); GOM al chocar («¡Mis osiconos!») o al activar el turbo («¡Que arda el queso!») |
| **Menús y resultados** | Consejos y datos absurdos («Las gaviotas no pagan», «El casco es obligatorio; la piña, no») y epitafios de fin de turno («GOM necesita un cuello ortopédico», «Pizza Rápida se ríe a lo lejos») |

Regla de oro: el chiste **nunca tapa información de juego** (va en el decorado, en bocadillos breves
o en momentos de calma) y cada peligro puede tener su señal cómica, que además funciona como aviso.

---

## 2. Estructura: «La Gran Avenida» infinita

### 2.1 Generación procedural por tramos
- El mundo se construye en **tramos de ~320 px** delante de la cámara y se destruye detrás.
- Cada tramo elige un **patrón** de una biblioteca ponderada (p. ej. *slalom de conos*, *ola de taxis*,
  *zona de obras*, *rampa + hueco*, *furgoneta rival*, *cruce de peatones*, *lluvia de barriles*…),
  filtrada por **barrio** y **nivel de dificultad**.
- **Cada partida usa una semilla aleatoria nueva**: no hay dos avenidas iguales. (El modo diario
  «Pedido del Día» usará una semilla compartida por todos los jugadores; ver §10.)
- **Reglas de justicia** del generador:
  1. En cualquier X siempre queda **al menos un carril libre** para obstáculos estáticos.
  2. Todo peligro aparece con un **tiempo de reacción mínimo** de ~1,1 s a la velocidad actual.
  3. Los peligros móviles se **telegrafían** (intermitentes, «!», faros, burbujas, burbujeo de alcantarillas).
  4. Tras un choque hay un **tramo de respiro** (sin patrones pesados durante ~2 s).
  5. Los clientes nunca se colocan dentro de un patrón denso: tienen su propio hueco.

### 2.2 Rutas y Pizzerías de Recarga
- Un turno (partida) es una cadena infinita de **Rutas**.
- Cada ruta tiene **N clientes** (empieza en 4 y sube hasta 8) y se cargan **N + 2 pizzas**.
- Al final de cada ruta aparece una **Pizzería de Recarga** (*checkpoint*):
  - GOM atraviesa su **bahía de carga** (zona marcada en el carril inferior).
  - **Mini-evaluación de ruta:** entregas, perfectos, pizzas perdidas → bonus de tiempo y monedas.
  - Se **recargan las pizzas**, **cambia el barrio** (al azar, nunca el mismo dos veces seguidas) y
    **sube la dificultad**.

### 2.3 Curva de dificultad
El nivel de dificultad `D` crece con la ruta (`D = ruta − 1`, con suavizado). Afecta a:

| Parámetro | Ruta 1 | Ruta 3 | Ruta 6 | Ruta 10+ |
|-----------|--------|--------|--------|----------|
| Densidad de tráfico | baja | media | alta | muy alta |
| Velocidad de vehículos | ×1,0 | ×1,12 | ×1,3 | ×1,45 (tope) |
| Patrones disponibles | básicos | + móviles | + combinados | todos |
| Zona de entrega (BIEN) | ±38 px | ±36 px | ±33 px | ±30 px |
| Ventana PERFECTO | ±9 px | ±8 px | ±7 px | ±5 px |
| Tiempo por entrega (PERFECTO / BIEN) | +4 / +2,6 s | +3,8 / +2,5 s | +3,4 / +2,2 s | +2,8 / +1,8 s |
| Clientes por ruta | 4 | 5 | 7 | 8 |

### 2.4 Fin de partida
- **Sin corazones** («¡Accidente!») o **sin tiempo** («¡Se enfrió la pizza!»).
- Pantalla de resultados: distancia (m), rutas completadas, pizzas entregadas / perdidas, perfectos,
  mejor combo, puntuación, **monedas ganadas**, récord personal y progreso de misiones.

---

## 3. Bucle jugable (Core Loop)

```
        ┌──────────────── MACRO (días) ────────────────┐
        │ monedas → garaje/cosméticos → misiones → récords
        │   ┌──────────── MESO (40–70 s) ──────────┐    │
        │   │ Recarga → Ruta (N clientes) → Evaluación de ruta → nuevo barrio
        │   │   ┌──────── MICRO (3–8 s) ────────┐  │    │
        │   │   │ ver cliente → colocarse en su  │  │    │
        │   │   │ carril → LANZAR con timing →   │  │    │
        │   │   │ puntos + tiempo + combo        │  │    │
        │   │   └────────────────────────────────┘  │    │
        │   └───────────────────────────────────────┘    │
        └────────────────────────────────────────────────┘
```

### Fase 1 — Recarga (*Pickup*)
- La partida arranca en la **Pizzería GOM**: el cocinero carga las pizzas en la caja (animación de
  cajas apilándose), el GPS muestra la ruta y una cuenta atrás **3-2-1 ¡A REPARTIR!** arranca el reloj.
- Cada Pizzería de Recarga repite esta fase **sin detener la acción** (se recarga al pasar por la bahía).

### Fase 2 — Conducción y evasión
- **Avance continuo** (*auto-scroll*): la moto nunca se para. El jugador controla la **profundidad**
  (arriba/abajo, movimiento continuo con inercia) y la **velocidad** (acelerar/frenar alrededor de la
  velocidad de crucero).
- Los carriles superiores son de **sentido contrario** (tráfico que viene de frente, más peligroso);
  los inferiores, del **mismo sentido** (tráfico lento que adelantar).
- **Chocar** resta 1 corazón, frena en seco la moto (×0,35), sacude la pantalla y da 1,2 s de invulnerabilidad.

### Fase 3 — La entrega (*Action Event*)
- Los clientes aparecen en la **acera norte** (arriba), la **acera sur** (abajo) o **ventanas**
  (Distrito Neón), con una **burbuja** que muestra su pedido y un indicador que parpadea antes de entrar en pantalla.
- Frente a cada cliente se ilumina una **zona de entrega** en el carril adyacente, con una franja
  central dorada.
- Pulsar **LANZAR** dentro de la zona:
  - **PERFECTO** (franja central): 250 pts × combo, **+4 s**, +22 % de turbo, confeti y un
    instante de cámara lenta.
  - **BIEN** (resto de la zona): 120 pts × combo, **+2,6 s**.
  - Lanzar sin ningún cliente cerca no hace nada (no se desperdician pizzas por un toque accidental).
- **FALLO:** lanzar fuera de zona desperdicia la pizza y **rompe el combo**; **pasarse** al cliente
  sin entregar lo pierde («¡Cliente perdido!») y también rompe el combo.
- **Combo:** cada entrega suma 1; el multiplicador es ×1 → ×2 (3 entregas) → ×3 (6) → ×4 (10) → ×5 (15).

### Fase 4 — Evaluación y progresión
- **Por ruta** (en cada pizzería): bonus de tiempo = 1,5 s por entrega + 0,5 s por perfecto
  (+3 s si pasas por la bahía de carga: «¡Recarga Express!»); «RUTA PERFECTA» si no se pierde
  ningún cliente (+1.000 pts). El reloj tiene un tope de 99 s.
- **Por partida:** la puntuación se convierte en monedas (1 moneda cada 50 pts) + monedas recogidas.
- Entre partidas, las monedas se gastan en el **Garaje** (§10.2).

---

## 4. Controles

| Acción | Táctil (móvil en horizontal) | Teclado |
|--------|------------------------------|---------|
| Cambiar de carril (profundidad) | Joystick flotante izquierdo ↑ ↓ | ↑ ↓ / W S |
| Acelerar / frenar | Joystick izquierdo → ← | → ← / D A |
| Lanzar pizza | Botón **LANZAR** (grande, abajo a la derecha) | Espacio / J |
| Turbo Mozzarella | Botón **TURBO** (se ilumina al estar cargado) | Shift / K |
| Salto (mejora) | Botón **SALTO** | L / C |
| Pausa | Botón «II» (arriba) · botón atrás de Android | P / Esc |

El joystick aparece donde se apoya el pulgar (zona izquierda de la pantalla), con zona muerta y
sin necesidad de mirarlo. Los botones tienen área táctil más grande que su dibujo.

---

## 5. Mecánicas base (detalle)

### 5.1 Velocidad
- Crucero 150 px/s · mínimo 95 px/s (frenando) · máximo 230 px/s (+6 % por nivel de **Motor**).
- La velocidad se nota: rayas de carretera, ruedas girando, partículas de polvo, líneas de velocidad a
  partir del 85 % y temblor ligero en turbo.

### 5.2 Profundidad
- Movimiento vertical continuo con aceleración e inercia (**Manejo** mejora la velocidad lateral un 12 % por nivel).
- La colisión usa **caja en el suelo** (sombra) + tolerancia vertical: lo que importa es dónde está la rueda, no la cabeza de la jirafa.

### 5.3 Vida
- 4 corazones (el **Chasis** nivel 3 añade un 5.º). Power-up **Corazón** recupera uno.
- El **Casco Dorado** absorbe un golpe.

### 5.4 Tiempo
- Se empieza con **45 s**. Cada entrega suma tiempo (ver §2.3) y cada pizzería da bonus.
- Con menos de 10 s: el reloj se pone rojo, late y suena un tic-tac.

---

## 6. Expansión de mecánicas (3 nuevas)

### 6.1 Turbo Mozzarella — casi-choques y rebufo (riesgo/recompensa)
- **Casi-choque («¡POR LOS PELOS!»):** pasar junto a un vehículo u obstáculo a muy poca distancia sin
  tocarlo da +50 pts y **+12 % de turbo**.
- **Rebufo:** ir justo detrás de un vehículo del mismo sentido llena el turbo poco a poco (líneas de
  aire visibles).
- **Activación** (barra ≥ 35 %): durante 2–3 s la moto va a ×1,55, levanta la rueda delantera
  (caballito), deja una **estela de queso fundido** y **arrolla conos, cajas, vallas y barriles**
  (+75 pts cada uno). Chocar con un vehículo en turbo no quita vida: rebota y corta el turbo.
- **Por qué funciona:** premia jugar cerca del peligro sin castigar al principiante (el turbo se llena
  también con PERFECTOS) y da un botón de «pánico» con coste.

### 6.2 Rampas y Entregas Aéreas — «¡Vuelo de Jirafa!»
- Rampas colocadas por el generador (a menudo antes de alcantarillas abiertas, obras o clientes).
- Al pisar una rampa GOM sale volando ~0,9 s (sprite en picado, sombra en el suelo que se aleja).
- En el aire es **inmune a obstáculos de suelo** (alcantarillas, conos, charcos, olas).
- **Lanzar en el aire** convierte la entrega en **ENTREGA AÉREA ×2** (y cuenta la zona de entrega
  en cualquier carril: el cuello largo tiene su ventaja).
- La mejora **Salto** permite saltar en cualquier momento con enfriamiento de 3 s.

### 6.3 Pizza Fever — la racha dorada
- **5 entregas seguidas sin fallar** activan la *Pizza Fever* durante 8 s:
  - la zona de entrega se ensancha y cualquier entrega cuenta como PERFECTO,
  - puntos ×2 sobre el combo, el tiempo ganado se duplica,
  - estela dorada, borde de pantalla brillante y capa extra de percusión en la música.
- Recompensa la **constancia** (no solo el riesgo) y crea «momentos épicos» en cada ruta.

### Extras de apoyo
- **Power-ups en la carretera:** ⏱️ Reloj (+8 s) · ❤️ Corazón · 🧲 Imán de monedas (8 s) ·
  ⛑️ Casco Dorado (escudo) · 📦 **Cañón de Pizzas** (6 s de entregas automáticas perfectas).
- **Clientes VIP** (burbuja dorada): zona más estrecha, ×2 puntos y +3 s extra.
- **Monedas** en líneas y arcos que invitan a caminos arriesgados (carril contrario, sobre rampas).

---

## 7. Obstáculos y enemigos dinámicos

### 7.1 Los cuatro dinámicos principales

| Obstáculo | Barrio | Patrón de comportamiento | Aviso (telegrafía) | Cómo superarlo |
|-----------|--------|--------------------------|--------------------|----------------|
| **Furgoneta Rival «Pizza Rápida»** | Todos (desde Neón) | Máquina de estados: **Seguir** (copia tu carril con 0,6 s de retraso) → **Intermitente** (0,5 s) → **Cerrarte** (se cambia a tu carril delante de ti) → **Frenazo** (luces de freno). Si llega antes que tú a la zona de un cliente, **le roba el pedido**. | Intermitentes naranjas, luces de freno rojas, icono de la marca rival en el GPS. | Adelantar con turbo, entregar antes, usar el otro carril. Adelantarla da «¡ADELANTAMIENTO!» (+100). |
| **Taxi Kamikaze** | Todos | Sale de frente por los carriles de sentido contrario al **doble de velocidad**. Variante zigzag: a mitad de pantalla cambia de carril. | «!» en el borde derecho + destello de faros 0,8 s antes; intermitente antes del zigzag. | Leer el aviso y cambiar de carril; casi-choque para cargar turbo. |
| **Peatón «Zombi del Móvil»** | Atardecer, Neón | Cruza la avenida de acera a acera despacio. Se **detiene** 0,6–1 s en mitad de un carril mirando el móvil y a veces **da media vuelta**. | Pantalla del móvil brillante y burbuja «…» antes de pararse. | Frenar o rodearlo; esperar a que siga andando. |
| **Alcantarilla Géiser** | Neón, Costa | Ciclo rítmico: cerrada 1,8 s → burbujea 0,8 s (con «!») → **chorro de vapor** 1 s. En chorro = choque; cerrada = segura. | Burbujas y temblor de la tapa durante el aviso. | Pasar por encima cuando está cerrada o saltarla en rampa. |

### 7.2 Peligros propios de cada barrio
- **Barriles rodantes** (camión de obras): bajan rodando hacia ti cruzando carriles en diagonal.
- **Gaviotas ladronas** (Costa): se lanzan en picado sobre las pizzas en el aire; una entrega
  PERFECTA (lanzamiento más rápido) las esquiva.
- **Olas** (Costa): una lámina de agua cruza la avenida de arriba abajo; espuma en la acera como aviso.
- **Charcos** (Neón): hacen derrapar (0,5 s sin control lateral fino).
- **Arena** (Costa): menos agarre, más inercia lateral.

### 7.3 Obstáculos estáticos
Conos (slaloms), cajas, barriles, vallas de obra con luz ámbar, alcantarillas abiertas y coches lentos.

---

## 8. Barrios (biomas) y progresión

En la avenida infinita los barrios se alternan al azar en cada Pizzería de Recarga. Cada visita repetida
a un barrio llega con más dificultad (vuelta 2, 3…), así que la curva nunca se estanca.

### 8.1 Avenida Atardecer — *el barrio de GOM* (introducción)
- **Estética:** cielo naranja-rosado con **rayos de sol girando** tras el skyline (como en el mockup),
  palmeras, casas mediterráneas de tejas, bancos, farolas que se van encendiendo, aves en el horizonte.
- **Introduce:** tráfico básico en ambos sentidos, conos, cajas, alcantarillas abiertas, rampas,
  peatones y clientes en las dos aceras. Es el barrio de aprendizaje (patrones suaves).
- **Música:** chiptune alegre en Do mayor, 128 BPM.

### 8.2 Distrito Neón — *noche, lluvia y rascacielos*
- **Estética:** noche azul-violeta, rascacielos con ventanas encendidas, **letreros de neón** que
  parpadean, **lluvia** y **reflejos** de las luces en el asfalto mojado, conos de luz de las farolas y
  **faro de la moto**.
- **Introduce:** furgonetas rivales **Pizza Rápida**, **clientes en ventanas** (hay que ir por el carril
  superior; zona más estrecha, ×1,5 pts), alcantarillas géiser, charcos resbaladizos y menor visibilidad.
- **Música:** *synthwave* chiptune en La menor, 140 BPM.

### 8.3 Costa Tormenta — *paseo marítimo bajo la tormenta*
- **Estética:** cielo turquesa-violeta, **relámpagos** que iluminan la escena, mar con oleaje animado tras la
  barandilla, palmeras al viento, casetas de playa y un **faro** cuyo haz barre el cielo.
- **Introduce:** **gaviotas ladronas**, **olas** que cruzan la avenida, **arena** con menos agarre y
  ráfagas de viento que empujan la moto (hojas y arena en horizontal como aviso).
- **Música:** chiptune tenso en Re menor, 150 BPM, con truenos.

### 8.4 Curva por barrio

| | Atardecer | Neón | Costa Tormenta |
|---|---|---|---|
| Visibilidad | total | reducida (faros) | variable (relámpagos) |
| Peligro nuevo | peatones, rampas | rivales, ventanas, géiseres, charcos | gaviotas, olas, arena |
| Clientes | aceras | aceras + ventanas | aceras (paseo y casetas) |
| Tráfico | ligero | denso | medio + camiones |

---

## 9. Interfaz (HUD) y menús

### 9.1 HUD en partida
- **Arriba izquierda:** retrato de GOM (expresiones) + **corazones** + **barra de turbo** (rayo).
- **Arriba centro:** **temporizador** con cronómetro (mm:ss), rojo y latiendo por debajo de 10 s;
  debajo, **puntuación** y **multiplicador de combo**.
- **Pizzas:** icono de caja + «×6» y progreso de ruta («RUTA 3 · 2/6»).
- **Arriba derecha:** **minimapa GPS** con la carretera de los próximos ~700 m: clientes (pines por
  acera), la próxima **pizzería de recarga**, furgonetas rivales (puntos rojos) y la flecha de GOM.
- **En el mundo:** zona de entrega brillante, burbuja de pedido, flecha en el borde para clientes que
  están a punto de entrar, textos flotantes (PERFECTO, BIEN, FALLO, +4 s, ¡POR LOS PELOS!).
- **Táctil:** joystick flotante semitransparente a la izquierda, botones LANZAR / TURBO / SALTO a la derecha.

### 9.2 Menús
Título animado (logo de GOM + avenida en movimiento) → Menú (Jugar · Garaje · Misiones · Récords ·
Ajustes) → Partida → Pausa → Resultados. Todo con la estética de las hojas de concepto: paneles
negros con marco amarillo fino y rotulación en mayúsculas pixel.

---

## 10. Progresión a largo plazo, retención y monetización

### 10.1 Economía
- **Monedas** (moneda blanda): puntuación convertida, monedas de la carretera, misiones y racha diaria.
- **Porciones Doradas** (moneda premium, opcional): solo para cosméticos; también se ganan jugando
  (misiones semanales, logros), nunca imprescindibles.

### 10.2 Garaje (mejoras permanentes, solo con monedas)

| Mejora | Efecto por nivel | Niveles | Coste (monedas) |
|--------|------------------|---------|-----------------|
| **Chasis** | −15 % frenazo al chocar; nivel 3: 5.º corazón | 3 | 150 · 400 · 900 |
| **Motor** | +6 % velocidad punta, +0,3 s de turbo | 5 | 120 · 250 · 450 · 700 · 1.000 |
| **Manejo** | +12 % velocidad lateral, −20 % derrape | 5 | 100 · 220 · 400 · 650 · 950 |
| **Salto** | Desbloquea el botón SALTO; niveles reducen el enfriamiento | 3 | 500 · 800 · 1.200 |
| **Cañón de Pizzas** | Habilidad: 1 carga por partida (entregas automáticas 6 s) | 3 | 600 · 1.000 · 1.500 |
| **Imán** | +2 s de duración del imán de monedas | 3 | 200 · 450 · 800 |

### 10.3 Cosméticos (lo que se enseña, no lo que gana)
Estelas de turbo (Humo, Queso, Fuego, Arcoíris, Neón, Estrellas), pinturas de moto, cascos y gafas,
cajas térmicas, bocinas y celebraciones de entrega. Se ven en la pantalla de título y en la de
resultados para que presumir tenga sentido.

### 10.4 Sistemas de retención
- **Misiones diarias (3)**, rotando de un banco de ~40 (12 en el prototipo: «Haz 12 entregas
  perfectas», «Recorre 3.500 m», «Haz 14 casi-choques», «Adelanta 3 furgonetas rivales»…),
  con 3 niveles de exigencia según la experiencia del jugador. Recompensa en monedas.
- **Misión semanal** larga con recompensa cosmética.
- **Racha diaria** de 7 días (calendario con premio creciente; el 7.º día, un cosmético).
- **Pedido del Día:** partida con **semilla diaria compartida** y ranking propio: todos juegan la misma avenida.
- **Rankings** global / amigos / semanal (Google Play Games Services) + récords locales.
- **Logros** (30+) y **Álbum de Clientes**: cada tipo de cliente atendido N veces desbloquea su ficha
  con una biografía cómica; personajes VIP raros («Doña Rosa», «El Chef de Pizza Rápida»…).
- **Temporadas de Reparto** (8 semanas): barrio temático (p. ej. Navidad nevada, Halloween), pase con
  vía gratuita y vía premium **solo cosmética**.
- **Eventos de fin de semana:** «Hora Punta» (doble tráfico, doble monedas).

### 10.5 Monetización ética
- Modelo recomendado: **free-to-play justo** o **premium** a precio bajo (2,99 €) con cosméticos.
- Sin energía ni esperas, **sin pagar para ganar**: las mejoras solo se compran con monedas ganadas jugando.
- Anuncios **solo con recompensa y siempre opcionales**: continuar una vez por partida o duplicar monedas.
- KPIs objetivo: retención D1 40 %, D7 15 %, D30 6 %; 4+ partidas por sesión.

---

## 11. Audio
- **Tema principal:** «Pizza Delivery 8-bit», de **saltamontesenelpelo**. Es la banda sonora de
  todo el juego (título, menús y partida) y se reproduce en bucle con un **fundido cruzado** de
  1,6 s para que no se note el corte. Está normalizado a −16 LUFS con 1,5 dB de margen para que
  los efectos se oigan por encima.
- **Música dinámica:** cada partida arranca el tema desde el principio (su introducción coincide
  con la cuenta atrás 3-2-1); en menús, pausa y resultados baja al 45 % del volumen; la **Pizza
  Fever** lo acelera un 6 % (sube el tono, a lo arcade) y con **menos de 10 s** en el reloj se
  acelera otro 4 % para meter tensión.
- **Respaldo:** si el dispositivo no puede reproducir el MP3, el juego cambia solo a los temas
  chiptune sintetizados con WebAudio (uno por barrio y otro para el título).
- **Efectos:** sintetizados en tiempo real (más de 30): motor que sube de tono con la velocidad,
  lanzamiento (*whoosh*), PERFECTO (arpegio brillante), BIEN, FALLO, choque, casi-choque, monedas,
  turbo, rampa y aterrizaje, trueno, gaviota, olas, claxon de la furgoneta rival, cuenta atrás y
  fanfarria de récord.

---

## 12. Tecnología

- **Prototipo:** HTML5 Canvas 2D + WebAudio en JavaScript sin dependencias, 60 fps, resolución lógica
  de 270 px de alto escalada en *pixel perfect*.
- **Android:** envoltorio nativo mínimo (Activity + WebView) en pantalla completa inmersiva, horizontal,
  pantalla siempre encendida; `minSdk 21`, `targetSdk 34`. Los recursos van dentro del APK (funciona sin conexión).
- **Arquitectura:** `core` (bucle, utilidades, RNG con semilla) · `assets` · `font` (fuente pixel propia) ·
  `audio` · `input` (táctil + teclado) · `fx` (partículas, textos, sacudidas) · `world` (barrios, parallax,
  carretera, iluminación) · `entities` · `generator` (tramos y patrones) · `hud` · `scenes` · `save`.
- **Sprites:** extraídos de las hojas de concepto con `tools/extract_sprites.py` (recorte, eliminación de
  fondo, reescalado *pixel art* por mediana y contorno) y completados con `tools/gen_sprites.py`
  (personajes con animación, coches, gaviotas, barriles, poses de GOM).
- **Guardado:** `localStorage` (monedas, mejoras, récords, misiones, ajustes).

### Hoja de ruta
1. **Prototipo** (este documento): bucle completo infinito, 3 barrios, meta-progresión básica.
2. **Vertical slice:** pase de arte (animaciones dedicadas de GOM lanzando), 30+ patrones por barrio, sonido final.
3. **Alfa:** Pedido del Día, rankings online, logros, álbum de clientes.
4. **Beta:** equilibrado con analítica, accesibilidad (modo daltónico, asistencia de lanzamiento), localización.
5. **Lanzamiento** en Google Play + web; temporadas.

---

## 13. Mapa de assets del concepto

| Hoja | Elementos usados |
|------|------------------|
| `hoja_sprites_a` | GOM en moto (sprite principal), moto sin jirafa, 6 expresiones, caja con logo, pizza, refresco, pin, móvil, GPS, conos, barril, banco, papelera, jardinera, hidrante, valla publicitaria, pizzería azul, muro, verja |
| `hoja_sprites_b` | GOM de frente y caminando con la pizza, cajas de pizza, porción, furgoneta (y variantes rival roja/verde), pizzería roja, casa, palmera, farola, cartel PIZZA, cliente (busto para ventanas), bandera, moneda, corazón, cronómetro, caja, rampa |
| `logo_gom` | Logo de la pantalla de título |
| `mockup_escena` | Referencia de composición, paleta del atardecer, HUD y minimapa |

---

## 14. Estado del prototipo (v1.0)

**Implementado y jugable** (HTML5 + APK Android):

- Avenida **infinita y aleatoria** (semilla nueva por partida) con generador por tramos, 18 patrones
  de obstáculos, reglas de justicia y dificultad creciente por ruta.
- **Rutas y Pizzerías de Recarga** con mini-evaluación, bahía de carga «Express», cambio de barrio
  aleatorio y transición suave de cielo, luz, clima y música.
- **3 barrios** completos: Avenida Atardecer (sol con rayos giratorios, casas mediterráneas),
  Distrito Neón (noche, lluvia, neones parpadeantes, reflejos en el asfalto, faros) y Costa
  Tormenta (mar animado, faro, relámpagos, ráfagas de viento).
- Entrega por *timing* (PERFECTO / BIEN / FALLO), combos ×1–×5, **Pizza Fever**, clientes VIP y
  en ventanas, gaviotas ladronas.
- **Turbo Mozzarella** (casi-choques, arrollar obstáculos), **rampas y entregas aéreas**, salto
  y cañón de pizzas (mejoras), power-ups (reloj, corazón, imán, casco, cañón, turbo), monedas.
- Obstáculos: furgoneta rival con máquina de estados que roba pedidos, taxi kamikaze con aviso y
  zigzag, peatones con móvil, alcantarillas géiser y abiertas, camión de obras con barriles
  rodantes, olas, charcos, arena, conos, vallas, cajas y tráfico en ambos sentidos.
- HUD completo (retrato con 6 expresiones, corazones, turbo, pizzas, ruta, cronómetro, combo,
  GPS con pines de clientes, rivales y pizzería), avisos en el borde y pistas de tutorial.
- Menús: título con demo automática, garaje (6 mejoras + 6 estelas cosméticas), misiones diarias,
  récords locales, ajustes (volúmenes, vibración, pistas, modo de imagen) y pausa.
- **Humor** en marcas, tiendas, neones, vallas, señales, frases y consejos (§1.4).
- Banda sonora «Pizza Delivery 8-bit» (saltamontesenelpelo) con bucle sin cortes, volumen por
  escena y aceleración en Fever y con poco tiempo; respaldo chiptune sintetizado y más de 30
  efectos generados en tiempo real.
- Controles táctiles (joystick flotante + botones) y de teclado; guardado local.

**Pendiente para siguientes fases:** Pedido del Día con semilla compartida, rankings online,
logros, álbum de clientes, temporadas, más cosméticos (pinturas y cascos) y más patrones por barrio.
