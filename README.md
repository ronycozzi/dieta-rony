# Dieta · Rony Cozzi · Mantener 78-80kg

App web (PWA instalable) para seguir un plan de dieta de **recomposición**:
ganar músculo sin subir de peso, manteniendo entre 78 y 80 kg.

Plan adaptado a rutina de gym de **4 días + 1 opcional**:
Lunes pecho/tríceps · Martes espalda/bíceps · Miércoles hombros/abdomen ·
Jueves piernas · Viernes full body opcional · Sábado/Domingo descanso.

## Funcionalidades

### Plan
- 7 días con kcal y macros calibrados por tipo de entreno
- Comidas con preparaciones detalladas paso a paso (4-7 pasos cada una)
- Sin yogur, avena, harina de arroz, arroz inflado, ricota, cottage, locro ni combinaciones raras fuera del criterio definido para Rony
- Pescado 1x semana (salmón viernes) por omega 3

### Tracking
- Marcar comidas completadas (persiste por día con localStorage)
- Barras de progreso de kcal, proteína, carbos y grasas en vivo
- Contador de 10 vasos de agua diarios (2.5L)
- Tracker de peso semanal con alertas:
  - Si pasás de 80kg → "achicá una porción de carbo"
  - Si bajás de 77kg → "sumá 200 kcal/día"
  - Si estás en rango → "mantenimiento perfecto"
- Streak de días consecutivos con 4+ comidas marcadas

### Vista
- Reloj y fecha en vivo
- Banner del día actual con qué entrenás y qué comer
- Resumen semanal con cumplimiento día a día (mini grid)
- Próxima comida con cuenta regresiva
- Toggle viernes: gym (2750 kcal) / descanso (2550 kcal)

### Acciones rápidas
- "Marcar comida actual" (detecta hora y marca la más cercana)
- "Compartir el día" (formato WhatsApp con todas las comidas y kcal)
- "Lista de compras" con cantidades semanales y exportar
- "Resetear día"

### Nutrición
- Suplementos base (creatina) y opcionales (whey como comodín, omega 3, vit D, magnesio)
- 10 reglas de mantenimiento + recomposición
- Notificaciones programadas para cada comida y agua cada 90 min

## Instalación en iPhone

1. Abrí la web en **Safari** (no Chrome — Chrome iOS no permite instalar PWA)
2. Tocá el botón **Compartir** (cuadrado con flecha hacia arriba)
3. Bajá y tocá **"Agregar a pantalla de inicio"**
4. Aceptá → la app aparece en el home como cualquier otra
5. Abrila desde el ícono y activá notificaciones

Después tenés:
- App fullscreen sin barra de Safari
- Funciona offline
- Notificaciones de comidas
- Ícono propio en el home

## Instalación en Android

1. Abrí la web en Chrome
2. Tocá el menú (⋮) y elegí "Agregar a pantalla de inicio"
3. Aceptá

## Desarrollo local

Abrí `index.html` con Live Server desde VS Code. Las notificaciones requieren `https://` o `localhost` (no funcionan con `file://`).

Para probar el Service Worker en mobile vía LAN:
```
npx serve . --listen 5173 --ssl-cert ...
```
o usar ngrok / Vercel / Netlify deploy.

## Validaciones

Validación rápida del plan (menú renderizado limpio, sin ingredientes bloqueados, todas las comidas con opción B y kcal en rango):
```
node scripts/audit-plan.js
```

## Estructura

```
brewco-web/
├── index.html      ← UI completa
├── styles.css      ← Tema oscuro, responsive, safe area iOS
├── script.js       ← Toda la lógica y dataset semanal
├── favicon.svg     ← Ícono PWA
├── manifest.json   ← PWA manifest
├── sw.js           ← Service Worker (offline + auto-update)
└── README.md
```

## Stack

HTML/CSS/JS vanilla, sin frameworks ni build step.
LocalStorage para persistencia. Service Worker para offline.
Network-first para HTML/JS/CSS (siempre versión nueva si hay internet).

## Notas

Esta app es orientación práctica basada en lineamientos generales de nutrición
deportiva para hipertrofia y recomposición. Para un plan clínico exacto o si
tenés condiciones médicas, consultá con un nutricionista deportivo.
