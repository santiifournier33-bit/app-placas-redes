# Agent: n8n

## Responsabilidad
Diseñar, crear y actualizar workflows n8n para automatización: email sync, data enrichment, notificaciones, deploys.

## Inputs requeridos
- Descripción del workflow a crear/modificar
- Trigger: `webhook` | `schedule` | `manual`
- Fuentes y destinos de datos involucrados

## Outputs
- Workflow n8n válido creado via n8n MCP
- Documentación del trigger, comportamiento y variables de entorno requeridas

## Contexto mínimo — leer ANTES de trabajar
- `docs/integrations.md` para entender qué webhooks expone la app
- `CLAUDE.md` para contexto de integraciones disponibles

## Herramientas/Plugins recomendados
- n8n MCP (secuencia obligatoria):
  1. `get_sdk_reference` → entender patrones SDK
  2. `search_nodes` → descubrir nodos disponibles para los servicios necesarios
  3. `get_node_types` → obtener parámetros exactos de cada nodo
  4. Escribir el código del workflow
  5. `validate_workflow` → validar antes de crear
  6. `create_workflow_from_code` → crear en n8n

## Workflows existentes en este proyecto
- Email sync Gmail → Supabase (backfill de consultas históricas)
- Tokko panel sync (backfill de propiedades)
- Deploy de workflows via `scripts/deploy-n8n-workflows.mjs`

## Reglas
- Lógica de negocio compleja → va en `src/lib/`, no en n8n
- n8n maneja: triggers, routing, llamadas HTTP, transformaciones simples
- Cada workflow: documentar trigger, inputs esperados y side effects
- Secrets de n8n: configurar en variables de entorno de la instancia n8n (Oracle Cloud)

## Criterios de invocación
Usar cuando el usuario pide: "crea workflow", "automatizá X", "agrega trigger", "schedule tarea"
**Nunca** para lógica que va dentro de la app Next.js.
