# E1 — Completar tarea ⇄ evento Google (spec)

Fecha: 2026-06-08 · Alcance: solo gap "A" del brainstorming de E1.

## Contexto

E1 (modelo unificado Tarea⇆Evento, opción "dos tablas sincronizadas") está casi
todo construido: las tareas con fecha ya aparecen en el calendario, crear/reprogramar/
borrar una tarea ya empuja/actualiza/saca su evento de Google (`taskStore.updateTask`,
`addTask`, `deleteTask`), y los recordatorios de tareas+eventos ya están unificados.

El único hueco con valor que el usuario eligió cerrar: **completar una tarea no se
refleja en Google** — el evento sigue figurando como pendiente en el Google Calendar
del asesor.

## Objetivo

Al **completar** una tarea con evento en Google, **sacar** ese evento de Google
(deja de ser pendiente). Al **des-completarla**, **volver a crearlo**. Google muestra
solo lo que falta hacer.

## Diseño

Único punto de cambio: `src/lib/stores/taskStore.ts`, acción `toggleTask`, después
del `update` exitoso en DB (tras el bloque de rollback por error, antes del bloque de
recurrencia).

```
if (completing) {
  if (task.google_event_id) syncTaskToGoogle(id, 'remove')
} else if (task.due_date) {
  syncTaskToGoogle(id, 'push')
}
```

- `task` = snapshot previo al toggle (ya capturado en la acción).
- Reusa el helper `syncTaskToGoogle` (fire-and-forget → `/api/google/tasks/sync`),
  y `removeTaskFromGoogle` / `pushTaskToGoogle` de `src/lib/google/calendar.ts`.
- **Sin** cambio de esquema, **sin** dependencia nueva, **un** archivo.

## Bordes

- Sin conexión Google o sin `google_event_id` → `remove` es no-op (la ruta lo maneja).
- Sync es best-effort, consistente con el patrón existente; el rollback optimista de
  la DB ya existe y no se toca.
- **Fuera de alcance** (gap pre-existente): al completar una tarea recurrente se crea
  la próxima instancia, pero esa nueva instancia no se empuja a Google hoy. No se toca.

## Verificación (manual; el proyecto no tiene tests)

1. Crear tarea con `due_date` y cuenta Google conectada → aparece evento en Google.
2. Completar la tarea → el evento desaparece de Google.
3. Des-completar → el evento vuelve a aparecer.
