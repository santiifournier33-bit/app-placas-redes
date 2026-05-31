# Runbook: n8n Update (npm install)

## Contexto
- **Versión actual:** 2.18.5
- **Server:** Oracle Cloud IP `144.22.45.201`
- **Método de install:** npm global (Node.js)
- **Persistencia:** workflows + credentials viven en `~/.n8n/` del usuario que corre n8n

## ⚠️ Antes de empezar

1. **Backup obligatorio** (paso 2). Credentials y workflows están en `~/.n8n/database.sqlite`.
2. **Tiempo estimado:** 10-20 min.
3. **Downtime:** ~1-2 min mientras se reinicia el servicio.
4. **Verificar Node.js version:** n8n recientes requieren Node 20+ (no Node 16/18).

---

## Paso 0: Verificar que el install actual ES npm (no Docker)

```bash
ssh -i ~/.ssh/private-freire.key ubuntu@144.22.45.201

# Chequear si hay containers Docker corriendo n8n
docker ps 2>/dev/null | grep n8n
# Si aparece algo → install es DOCKER, no npm. Ver sección "Migración Docker → npm" abajo.

# Chequear si n8n está como binario npm global
which n8n
n8n --version
# Esperado: /usr/local/bin/n8n  +  2.18.5
```

Si `which n8n` no devuelve nada y `docker ps` muestra n8n: **tu install es Docker**, no npm. Decisión:
- Opción A: Mantener Docker (cambiar mente, usar runbook Docker)
- Opción B: Migrar a npm (ver "Migración Docker → npm" al final)

---

## Paso 1: Verificar Node.js version

```bash
node --version
# Esperado: v20.x o v22.x
```

Si Node < 20:

```bash
# Instalar Node 20 via nvm (recomendado)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20

# Verificar
node --version   # v20.x
```

---

## Paso 2: Backup completo

```bash
# Stop n8n primero (no backup mientras está corriendo, puede corromper SQLite)
sudo systemctl stop n8n
# o si no es systemd: pkill -f n8n  o  pm2 stop n8n  (depende del manager)

# Backup directorio completo
tar -czvf ~/n8n-backup-$(date +%Y%m%d-%H%M).tar.gz ~/.n8n

# Verificar
ls -lh ~/n8n-backup-*.tar.gz
# Debe ser >100KB típicamente
```

---

## Paso 3: Identificar service manager

```bash
# Opción A: systemd
sudo systemctl status n8n
# Si devuelve "active (running)" o "inactive" → systemd

# Opción B: pm2
pm2 list 2>/dev/null
# Si lista contiene "n8n" → pm2

# Opción C: tmux/screen/manual
ps aux | grep n8n
# Si corre suelto, probable que esté en tmux/screen o levantado a mano
```

Anotar el manager — lo necesitás para los pasos 5 y 7.

---

## Paso 4: Update n8n via npm

```bash
# Asegurar que n8n no está corriendo (paso 2 ya hizo stop)

# Update al latest
sudo npm install -g n8n@latest

# o a versión específica (recomendado si querés ir incremental):
# sudo npm install -g n8n@2.20.0    # next minor
# sudo npm install -g n8n@2.23.0    # latest dentro de 2.x

# Verificar
n8n --version
# Esperado: nueva versión (ej. 2.23.x)
```

> Si npm install falla con permisos: ejecutar con `sudo`. Si falla con "EACCES on global path", revisar `npm config get prefix` y arreglar ownership: `sudo chown -R $(whoami) $(npm config get prefix)`.

---

## Paso 5: Restart n8n

### Si systemd:
```bash
sudo systemctl start n8n
sudo systemctl status n8n     # verificar "active (running)"
sudo journalctl -u n8n -f     # ver logs en vivo, Ctrl+C para salir
```

### Si pm2:
```bash
pm2 restart n8n
pm2 logs n8n --lines 50       # ver logs
```

### Si manual (tmux/screen):
```bash
tmux attach -t n8n        # o el nombre de la sesión
# Adentro de la session vieja, lanzar:
n8n start
# Detach: Ctrl+B luego D
```

---

## Paso 6: Verificar startup

En los logs buscar:
```
Migrations completed
Editor is now accessible via:
http://localhost:5678
```

Si hay errores de migration: **NO seguir**. Restaurar backup (ver Recovery).

---

## Paso 7: Verificación en browser

```
1. http://144.22.45.201:5678/
2. Login: santiifournier33@gmail.com + password
3. Help → About → confirmar nueva versión
4. Workflows tab → todos los workflows presentes
5. Credentials tab → todas las credentials presentes
6. Ejecutar manualmente un workflow simple
```

---

## Recovery (si update falló)

```bash
# Stop n8n
sudo systemctl stop n8n    # o pm2 stop n8n

# Restaurar backup
rm -rf ~/.n8n
tar -xzvf ~/n8n-backup-YYYYMMDD-HHMM.tar.gz -C ~/

# Re-instalar versión vieja
sudo npm install -g n8n@2.18.5

# Restart
sudo systemctl start n8n
```

---

## Post-update

1. Actualizar `docs/INFRAESTRUCTURA-FREIRE.md` con la nueva versión.
2. Verificar workflows críticos:
   - `Zonaprop Enrich (Real-time)`
   - `tokko-panel-renew-session` (si está en n8n)
3. Borrar backups viejos cuando confirmes estabilidad (>1 semana):
   ```bash
   ls -lh ~/n8n-backup-*.tar.gz
   rm ~/n8n-backup-VIEJO.tar.gz
   ```

---

## Breaking changes — leer ANTES del update

Release notes: https://docs.n8n.io/release-notes/

Saltar de 2.18.5 al latest implica leer notes de cada minor intermedio. Buscar:
- "Breaking change" / "BREAKING"
- Cambios en credentials format (Gmail, Supabase, HTTP)
- Cambios en estructura de nodos usados por workflows

---

## Migración Docker → npm (si tu install actual es Docker)

> Solo si confirmaste en Paso 0 que tu install es Docker y querés cambiar a npm.

```bash
# 1. Backup del volumen Docker
docker inspect n8n | grep -A 5 Mounts   # ver ruta del host
sudo tar -czvf ~/n8n-docker-backup.tar.gz <ruta-del-host>

# 2. Copiar data del volumen a ~/.n8n
mkdir -p ~/.n8n
sudo cp -r <ruta-del-host>/* ~/.n8n/
sudo chown -R $USER:$USER ~/.n8n

# 3. Stop + remove Docker container
docker stop n8n && docker rm n8n

# 4. Instalar Node.js 20 (ver Paso 1)

# 5. Instalar n8n via npm
sudo npm install -g n8n@latest

# 6. Setup como systemd service (recomendado para que reinicie solo)
sudo tee /etc/systemd/system/n8n.service > /dev/null <<EOF
[Unit]
Description=n8n
After=network.target

[Service]
Type=simple
User=$USER
ExecStart=/usr/local/bin/n8n start
Environment=N8N_HOST=144.22.45.201
Environment=N8N_PORT=5678
Environment=N8N_PROTOCOL=http
Environment=WEBHOOK_URL=http://144.22.45.201:5678/
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable n8n
sudo systemctl start n8n
sudo systemctl status n8n

# 7. Verificar en browser
# http://144.22.45.201:5678/
```

---

## Acceso para debug

```bash
# Logs
sudo journalctl -u n8n -n 100 --no-pager   # últimos 100 logs
sudo journalctl -u n8n -f                  # tail live

# Restart limpio
sudo systemctl restart n8n

# Ver versión
n8n --version

# Ver config activa
n8n config:list 2>/dev/null || cat ~/.n8n/config
```
