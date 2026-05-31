# Git Workflow — app-placas-redes

## Branches

| Branch | Rol | Deploy automático |
|---|---|---|
| `main` | Producción | Netlify `https://app-interna-freire.netlify.app/` |
| `staging` | Integración / pre-producción | Netlify branch preview (si configurado) |
| `redesign-visual-taste-v2` | Feature branch específica (rediseño UI/UX) | Deploy preview por PR |

**Remote:** `https://github.com/santiifournier33-bit/app-placas-redes.git`

## Flujo estándar

```
feature-branch  →  staging  →  main
                                 ↓
                              Netlify prod
```

1. Para cada feature/fix: crear branch desde `staging`
   ```bash
   git checkout staging
   git pull origin staging
   git checkout -b feature/nombre-corto
   ```

2. Commits frecuentes (un commit por unidad lógica). Mensajes en español OK. Caveman style preferido (ver `caveman-commit` skill).

3. Push y abrir PR a `staging`
   ```bash
   git push -u origin feature/nombre-corto
   gh pr create --base staging --title "..." --body "..."
   ```

4. Code review obligatorio antes de merge a `staging`. Tools:
   - `code-review --comment` para review pre-merge
   - `security-review` si toca auth/endpoints/deploy
   - Tests deben pasar (`npm run test`)

5. Merge a `staging`. Verificar deploy preview funcional.

6. Cuando `staging` está estable: merge `staging → main`. Solo del owner.
   ```bash
   git checkout main
   git pull origin main
   git merge --no-ff staging
   git push origin main
   ```

7. Tag de release opcional:
   ```bash
   git tag -a v1.x.0 -m "Release notes..."
   git push origin v1.x.0
   ```

## Reglas obligatorias

### Prohibido en `main`

- `git push --force` (rompe historial compartido)
- Commits directos (siempre vía merge desde staging)
- Rebases que reescriban historial pusheado

### Prohibido en cualquier branch

- Skip de hooks (`--no-verify`) salvo emergencia explícita
- Commit de secrets (`.env*`, keys, tokens)
- Commit de binarios grandes (>10MB)

### Permitido pero requiere cuidado

- `git rebase` para limpiar historia local antes de push (solo si la branch es tuya)
- `git push --force-with-lease` en feature branches propias (no en staging/main)

## Pre-commit checks

Antes de commitear:
1. `npm run lint` debe pasar
2. `npm run test` debe pasar
3. TypeScript compila (`npx tsc --noEmit`)

Netlify build correrá los 3 nuevamente — si fallan ahí, el deploy falla.

## Pull / Sync de cambios remotos

```bash
git fetch origin
git status   # ver si estamos behind
git pull --rebase origin <branch>   # rebase sobre remoto (más limpio que merge)
```

Si hay conflictos: resolver manualmente. **No usar `git checkout --ours/theirs` sin entender** — perderías cambios.

## Estado actual del repo (al momento de escribir este doc)

- Branch actual: `staging`
- Cambios uncommitted: 14+ archivos modificados + nuevos archivos (resultado de sesiones de gobernanza y refactor)
- Próxima acción recomendada: revisar el diff, commitear por unidades lógicas, push a `staging`, abrir PR a `main` cuando esté listo

## Comandos útiles

```bash
# Ver branches locales + remotos
git branch -a

# Ver commits diverged entre branches
git log --oneline staging..main
git log --oneline main..staging

# Limpiar branches mergeadas
git branch --merged main | grep -v "^\*\|main\|staging" | xargs git branch -d

# Stash temporal (cambios sin commitear, switch de branch)
git stash push -m "nombre descriptivo"
git stash pop
```

## Integración con Claude Code

- Usar `caveman-commit` skill para mensajes comprimidos
- Usar `finishing-a-development-branch` (Superpowers) cuando feature está lista
- Usar `pr-review` o `review` skill al recibir PRs
- Usar `code-review --comment` antes de abrir PR

## Branches actuales — propósito

| Branch | Estado | Acción pendiente |
|---|---|---|
| `main` | Estable, producción | — |
| `staging` | Activa, integración | Mergear cambios uncommitted pendientes |
| `redesign-visual-taste-v2` | Feature branch | Decisión: mergear a staging o descartar si quedó obsoleta |
