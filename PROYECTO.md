# AeroSim · Documentación completa del proyecto

> Documento de referencia del proyecto **aerosim-ingenieria-aeroespacial**: qué es, cómo está armado, qué hace cada archivo y qué modelo físico hay detrás de cada simulación.

---

## 1. Resumen

**AeroSim** es un simulador web interactivo para estudiar el 2do parcial de **Conocimientos Aeronáuticos y Espaciales I (CAE I)**, de Ingeniería Aeroespacial (UTN FRH).

- Una sola página con **11 unidades** (pestañas).
- Cada unidad combina **una simulación manejable** (izquierda), **la explicación del tema** (derecha) y un recuadro **"Para el parcial"** con lo que hay que saber de memoria.
- Es una aplicación **100 % estática**: HTML + CSS + JavaScript puro. No hay build, no hay dependencias, no hay backend. Se abre con doble clic en `index.html`.

| Dato | Valor |
|---|---|
| Autor (GitHub) | `craken06` |
| Repositorio | `aerosim-ingenieria-aeroespacial` |
| Idioma de la interfaz | Español (es-AR) |
| Tecnologías | HTML5, CSS3, JavaScript (ES2015+), Canvas 2D |
| Dependencias | Ninguna (solo Google Fonts, opcional) |
| Tamaño aproximado | 558 KB en disco, ~3.700 líneas |
| Fuente del contenido | PPT "Repaso 2do Parcial — Materiales + Proceso de Fabricación" (cátedra CAE I, Rev. 0 2025) |

---

## 2. Estructura de archivos

```
.
├── index.html                    Página única: encabezado, barra de pestañas y las 11 unidades (1159 líneas)
├── README.md                     Presentación del repositorio para GitHub
├── PROYECTO.md                   Este documento
├── .gitignore                    Excluye Thumbs.db, desktop.ini, .DS_Store
├── css/
│   └── estilos.css               Tema claro/oscuro, layout y componentes (113 líneas)
├── js/
│   ├── nucleo.js                 Utilidades, canvas, controles, pestañas y bucle (237 líneas)
│   ├── hipersustentadores.js     Flaps, slats, curva CL–α, polar y punto M (269)
│   ├── spoilers.js               Dibujos compartidos de avión + spoilers (182)
│   ├── comandos.js               Alerones, profundidad, dirección, elevones (96)
│   ├── compensadores.js          Compensación por cornadura (86)
│   ├── empenaje.js               Cola en V (72)
│   ├── estructura-ala.js         Componentes del ala y cargas (151)
│   ├── materiales.js             Acero, tratamientos, aluminio, compuestos, sándwich (294)
│   ├── proteccion-termica.js     TPS, ablativos, MLI, vacío térmico (292)
│   ├── fabricacion.js            Las 9 etapas del proceso (92)
│   ├── cohetes.js                Tsiolkovsky, etapas y órbitas (170)
│   └── inicio.js                 Arranque: llama a boot() al cargar (2)
├── apuntes/
│   └── Repaso_2do_Parcial.md     El PPT de la cátedra pasado a texto (388 líneas)
└── img/
    └── captura.jpg               Captura usada en el README
```

---

## 3. Unidades del simulador

Cada unidad es una `<section class="panel" id="p-…">` en `index.html` y un módulo registrado en `js/`.

| # | Pestaña | `id` | Módulo JS | Sub-pestañas |
|---|---|---|---|---|
| 1 | Hipersustentadores | `hiper` | `hipersustentadores.js` | Flaps y curva CL–α · Polar y punto de transición |
| 2 | Spoilers | `spoil` | `spoilers.js` | (modos: control lateral / aerofreno en vuelo / aerofreno en tierra) |
| 3 | Comandos | `comandos` | `comandos.js` | (modos: avión convencional / ala delta sin cola) |
| 4 | Compensadores | `comp` | `compensadores.js` | — |
| 5 | Empenaje en V | `cola` | `empenaje.js` | — |
| 6 | Estructura del ala | `ala` | `estructura-ala.js` | Componentes · Cargar el ala |
| 7 | Materiales | `mat` | `materiales.js` | Acero SAE · Tratamientos térmicos · Aluminio · Compuestos · Sándwich |
| 8 | Protección térmica | `tps` | `proteccion-termica.js` | Reentrada (TPS) · Ablativos · Mantas MLI · Vacío térmico |
| 9 | Fabricación | `fab` | `fabricacion.js` | 9 etapas navegables |
| 10 | Tsiolkovsky | `tsio` | `cohetes.js` | — |
| 11 | Etapas y órbitas | `etapas` | `cohetes.js` | 1 etapa vs 2 etapas · Órbitas |

### 3.1 Hipersustentadores
- Perfil **NACA 2412** en un "túnel" con líneas de corriente y partículas que aceleran en el extradós. Flechas de sustentación (L) y resistencia (D).
- **Borde de ataque**: ninguno, sencillo, Krueger, Betz, slat y slat automático (Handley Page, se abre solo entre ~5° y 11° de α).
- **Borde de fuga**: ninguno, sencillo, ranurado, de intradós, acharnelado y Fowler.
- Controles: ángulo de ataque α (−4° a 24°), deflexión del flap de fuga (0–40°) y del dispositivo de ataque (0–25°).
- Lecturas: CL actual, CL máx, ángulo de pérdida, CD del perfil. Gráfico CL–α comparando perfil limpio contra configuración elegida.
- Modelo: cada dispositivo tiene incrementos tabulados (`dCL`, `dCLmax`, `dCD`, `ext` de extensión de cuerda); la pérdida se suaviza con una función `smin` (mínimo suave).
- **Polar y punto M**: avión de 5.000 kg y 30 m², vuelo nivelado (L = W). Dos polares (con y sin flaps) y resistencia total vs velocidad; permite ver cuándo conviene meter o sacar flaps y dónde se cruzan (punto M).

### 3.2 Spoilers
- Tres modos: **control lateral** (palanca arrastrable), **aerofreno en vuelo** (deflexión 0–60°, vuelve a 540 km/h) y **aerofreno en tierra** (dos aviones de 60 t aterrizando a 252 km/h, uno con spoilers a 60° y otro sin).
- Fuerza de frenado de rueda: `μ·(W − L)`. Con spoilers casi desaparece L y sube la carga sobre las ruedas.
- Define los dibujos de avión compartidos con otros módulos.

### 3.3 Comandos
- Avión convencional: palanca a un costado → alerones (rolido); adelante/atrás → timón de profundidad (cabeceo); pedales → timón de dirección (guiñada).
- Ala delta sin cola: **elevones** (alerón + profundidad en la misma superficie), con mezcla de órdenes cuando se mueve la palanca en diagonal.
- Vista en planta con colores por deflexión y actitud del avión; la palanca vuelve sola al centro; teclado con flechas.

### 3.4 Compensadores
- Tres configuraciones: sin compensar, **cornadura desprotegida** y **cornadura protegida**.
- Controles: deflexión del timón, velocidad y tamaño del cuerno.
- Muestra el momento de bisagra / fuerza en la palanca y la **sobrecompensación** cuando el cuerno es demasiado grande.

### 3.5 Empenaje en V (cola de mariposa)
- Vista trasera con fuerzas por plano y resultante; palanca (profundidad), pedales (dirección) y ángulo de cada plano con la horizontal (25°–50°).
- Lecturas: fuerza vertical, fuerza lateral, **torsión en el fuselaje** con cola V y la misma maniobra con cola clásica (la V exige más fuerza por plano al dividir por `sen γ`).

### 3.6 Estructura del ala
- **Componentes**: largueros, costillas maestras, revestimiento, herrajes (principales) y falsas costillas, larguerillos, refuerzos (secundarios). Vista en planta y corte con tarjeta descriptiva.
- **Cargar el ala**: semiala de 8 m de un avión de 5.000 kg con sustentación elíptica; factor de carga n de −1,5 a 6 g y deflexión de alerón ±20° (torsión). Calcula momento y corte en raíz, flecha en puntera, tensión máxima en larguero y torsión; diagramas de corte y momento flector. La deformación se dibuja exagerada ×3.

### 3.7 Materiales
- **Acero SAE**: decodificador de designación de 4 dígitos (10 aceros: 1020, 1045, 2330, 3140, 4130, 4340, 5140, 6150, 8620, 9260), efecto del carbono y **fuselaje reticulado de acero 4130** resuelto por **método de rigidez** (tubos de 0,9 mm de pared, E = 205 GPa, σ fluencia ≈ 460 MPa), con detección de pandeo.
- **Tratamientos térmicos**: recocido, normalizado, temple, temple + revenido (temperatura ajustable 200–650 °C) y solución + envejecimiento de aluminio.
- **Aluminio**: 2024-T3 (Al-Cu) vs 7075-T6 (Al-Zn), según se trabaje a tracción/fatiga o a compresión.
- **Compuestos**: fibra de vidrio, carbono y Kevlar 49; fracción de fibra y ángulo carga–fibra; ciclo de curado en autoclave; filamento de carbono al calentarse.
- **Sándwich**: núcleos Nomex, panal de aluminio y espuma; espesor de núcleo/chapas y carga repartida; relación rigidez sándwich/chapa maciza del mismo peso.

### 3.8 Protección térmica
- **Reentrada (TPS)**: trayectoria, flujo de calor en la nariz y zonas RCC / HRSI / AFRSI sobre el Orbiter; botón para quitar el TPS.
- **Ablativos**: escudo de cápsula y ensayo **ASTM E285**. Modelo 1D por diferencias finitas con propiedades de carbono-fenólico (ρ = 1450 kg/m³, k = 0,6 W/m·K, calor efectivo de ablación 25 MJ/kg). Muestra char, zona de pirólisis, material virgen y estructura.
- **Mantas MLI**: satélite en órbita baja (92 min/vuelta, ~36 min de sombra) con 0, 1, 5 o 20 capas y potencia de electrónica ajustable.
- **Vacío térmico**: ensayo de ciclado térmico para LEO, MEO y GEO, con el caso real del satélite GOES-S.

### 3.9 Fabricación
- Recorrido navegable por las **9 etapas**: estudios preliminares y anteproyecto → túnel aerodinámico → proyecto → mock up → fabricación de componentes → prototipos → ensayos en vuelo y certificación → producción en serie → comportamiento en servicio.
- Diagrama de flujo con flechas de retroalimentación y una microsimulación por etapa.

### 3.10 Tsiolkovsky
- Ecuación del cohete `ΔV = c·ln(M₀/Mf)`, con `c = Isp·g₀`.
- Propelentes: sólido (Isp 250 s), kerosene + LOX (311 s), hidrógeno + LOX (450 s).
- Controles: masa inicial (20–500 t), % de propelente (30–95 %), tiempo de combustión (60–400 s).
- Modo **sin gravedad** o **despegue vertical** (`ΔV real ≈ c·ln(M₀/Mf) − g·t`). Gráfico ideal vs real.

### 3.11 Etapas y órbitas
- **1 etapa vs 2 etapas**: compara radios de masa y ΔV con la misma masa de propelente y estructura total; parámetros: carga útil, propelente, fracción estructural, Isp y reparto del propelente. Meta de referencia: ΔV ≈ 9,4 km/s a órbita baja.
- **Órbitas**: circulares de 0 a 1.000 km con atajos a ISS (400 km), GPS (20.200 km) y GEO (35.786 km). Calcula `v = √(μ/r)`, `T = 2π√(r³/μ)`, velocidad de escape y ΔV con transferencia de Hohmann. Constantes: μ = 398.600,4418 km³/s², R⊕ = 6.371 km.

---

## 4. Arquitectura del código

### 4.1 Orden de carga
`index.html` carga los scripts como globales clásicos (sin módulos ES), en este orden:

```
nucleo.js → hipersustentadores.js → spoilers.js → comandos.js → compensadores.js → empenaje.js
→ estructura-ala.js → materiales.js → proteccion-termica.js → fabricacion.js → cohetes.js → inicio.js
```

`nucleo.js` va primero porque expone las utilidades; `inicio.js` va último porque dispara `boot()`.

### 4.2 Ciclo de vida
1. Cada módulo llama a `register(id, módulo)` con un objeto que expone `init()` y `frame(dt)`.
2. `boot()` lee la paleta CSS, inicializa rangos, grupos segmentados y sub-pestañas, ejecuta `init()` de todos los módulos y arranca el bucle `requestAnimationFrame`.
3. En cada cuadro, `loop()` ejecuta **solo el `frame(dt)` del módulo activo** (con `dt` limitado a 50 ms), así que las pestañas ocultas no consumen CPU.
4. Al cambiar el tema claro/oscuro, `nucleo.js` marca `dirty` en los canvas y en los módulos para forzar el repintado con la paleta nueva (algunos módulos, como Hipersustentadores, usan `dirty` para repintar solo cuando algo cambió).

### 4.3 API de `nucleo.js`

| Grupo | Elementos |
|---|---|
| Selectores | `$`, `$$`, `val(id)`, `seg(name)` |
| Matemática | `clamp`, `lerp`, `D2R`, `R2D`, `G0 = 9.80665`, `fmt` (formato `es-AR`), `solve` (Gauss con pivoteo), `niceTicks` |
| Color | `readPalette` / `PAL` (lee variables CSS), `alpha`, `mix`, `heatColor` (rampa térmica) |
| Canvas | `makeCanvas(id, ratio)` con DPR (máx. 2) y `ResizeObserver`, `clear` |
| Dibujo | `line`, `poly`, `arrow`, `txt`, `dot`, `plotFrame` (ejes y escalas), `curve` |
| Aerodinámica | `naca(m,p,t,x)`, `airfoilPart`, `rot` |
| Controles | `initRanges` (sliders con `<output>`), `initSegs` (botones segmentados), `initSubnavs`, `makePad` (palanca 2D con puntero y teclado) |
| Navegación | `register`, `showTab`, `boot`, `loop` |

### 4.4 Navegación y persistencia
- La pestaña activa se refleja en el **hash** de la URL (`#hiper`, `#tsio`, …), lo que permite enlazar directo a una unidad.
- Se guarda la última pestaña en `localStorage` (`cae-tab`), con `try/catch` por si el navegador lo bloquea.

### 4.5 Estilos y accesibilidad
- Sistema de diseño con variables CSS (`--bg`, `--surface`, `--ink`, `--accent`, `--warm`, `--good`, `--bad`…).
- **Tema claro y oscuro** automáticos (`prefers-color-scheme`) y forzables con `data-theme="light|dark"`; al cambiar se repinta todo.
- Tipografías: Saira Condensed (títulos), Archivo (texto), JetBrains Mono (números); si no hay internet se usan las del sistema.
- Responsive: grilla de dos columnas que pasa a una en ≤ 900 px; barra de pestañas con scroll horizontal; respeta `safe-area-inset` en celulares.
- Accesibilidad: roles `tablist`/`tab`, `aria-pressed`, `aria-selected`, `aria-live`, foco visible, palanca operable con flechas, `prefers-reduced-motion`.

### 4.6 Convenciones de contenido en `index.html`
- `.ppt`: texto tomado del PPT de la cátedra (borde izquierdo).
- `.card`: explicación; `.note`: aclaraciones y supuestos del modelo.
- `.exam`: recuadro **"Para el parcial"**.
- `.readouts` / `.ro`: lecturas numéricas; `.status`: mensaje de estado (`good`, `warn`, `bad`).

---

## 5. Apuntes (`apuntes/Repaso_2do_Parcial.md`)

Conversión a texto del PPT de repaso (Rev. 0 2025) de la cátedra CAE I. Los contenidos que en el original eran solo imágenes se marcan como *[contenido gráfico en el original]* y las fórmulas que faltaban se agregan marcadas como **complemento**.

Índice: 1 Temas del parcial · 2 Materiales · 3 Procesos de fabricación · 4 Hipersustentadores (ataque, fuga, punto de transición, spoilers) · 5 Compensadores · 6 Estructura del ala · 7 Comandos y grupo de cola · 8 Tsiolkovsky · 9 Etapas · 10 Aceros · 11 Aluminio · 12 Compuestos · 13 Sándwich · 14 Materiales de un avión actual · 15 TPS · 16 Proceso de fabricación en detalle.

**Cátedra:** Ing. Aer. Roberto García y Ing. Aer. Juan Pablo Pla (profesores), Ing. Aer. Rodrigo Zaguir (JTP), Ing. Aer. Federico Orue (ATP).

---

## 6. Cómo ejecutarlo

**Local:** abrir `index.html` con doble clic. No requiere servidor ni instalación.

**Con servidor local (opcional):**
```bash
python -m http.server 8000
# luego abrir http://localhost:8000
```

**Publicado en GitHub Pages:** *Settings → Pages → Branch `main` → `/ (root)` → Save*. URL resultante:
`https://craken06.github.io/aerosim-ingenieria-aeroespacial/`

---

## 7. Publicación en GitHub

```bash
git init
git add .
git commit -m "AeroSim: simulador del 2do parcial de CAE I"
git branch -M main
git remote add origin https://github.com/craken06/aerosim-ingenieria-aeroespacial.git
git push -u origin main
```

Crear antes el repositorio vacío `aerosim-ingenieria-aeroespacial` en la cuenta `craken06` (sin README inicial, para evitar conflictos con el que ya está en este proyecto).

---

## 8. Limitaciones y supuestos

- Los modelos son **didácticos y simplificados**, con valores típicos de bibliografía (MMPDS, fabricantes). Sirven para entender el comportamiento, **no para dimensionar**.
- Los slats se agregaron aparte porque el PPT original no los incluye.
- La pestaña de tratamientos térmicos usa valores orientativos para acero 4130 y aluminio 2024/7075; el PPT solo nombra el tema.
- Los rangos de temperatura del ensayo de vacío térmico son ejemplos típicos; cada programa define los suyos.
- Las fuentes de Google Fonts requieren internet; sin conexión la página funciona con tipografías del sistema.
- El temario original del parcial incluye también Sistema Solar, movimientos de la Tierra y fuselaje; el simulador cubre las unidades técnicas y de materiales/fabricación, no esos tres temas.

---

## 9. Ideas para seguir

- Agregar las unidades que faltan (Sistema Solar y movimientos de la Tierra, fuselaje).
- Incorporar un modo de autoevaluación con preguntas tipo parcial.
- Agregar una licencia (por ejemplo MIT) al repositorio.
- Sumar capturas o un GIF por unidad al README.
