# TaskView: instalación local para el trabajo diario

Despliegue de TaskView con Docker Compose, aislado del resto de proyectos y con los datos en un volumen persistente. Lo usamos para administrar las tareas del trabajo, también desde Claude por MCP.

**¿Cómo se usa la herramienta en el día a día?** → [GUIA-USO.md](GUIA-USO.md)

| Servicio | URL | Para qué |
|---|---|---|
| Web | http://localhost:8888 | Interfaz: proyectos, Kanban, sprints, tiempos |
| API | http://localhost:1725 | Backend (lo usa la web y el MCP) |
| MCP | http://localhost:3100/mcp | Conexión para Claude Code y otros asistentes |

## Cómo está armado

```
            127.0.0.1 (solo este equipo)
  :8888 ─► taskview-webapp ─┐
  :1725 ─► taskview-api-server ◄── taskview-mcp ◄─ :3100
                │   red taskview_app
  ──────────────┼─────────────────────────────────
                ▼   red taskview_db (interna, sin Internet)
               db (postgres:17) ──► volumen taskview_pgdata
               migration (se ejecuta y termina en cada arranque)
```

- **Aislado:** proyecto Compose `taskview`; todos sus contenedores, redes y volúmenes llevan ese prefijo y no chocan con otros stacks. Postgres no publica puertos y su red es `internal`. Los puertos publicados escuchan solo en `127.0.0.1`, así que nadie de la red local los ve.
- **Persistente:** todo dato vive en el volumen **`taskview_pgdata`**. Se conserva con `docker compose down`, al reiniciar Windows y al actualizar imágenes. Los logs de la API van a `taskview_api_logs`.
- **Versión fijada:** las imágenes `gimanhead/taskview-ce-*` usan `TASKVIEW_VERSION` de `.env` (no `latest`), así una actualización nunca ocurre sin querer.
- **Cerrado:** sin registro público (`ALLOW_PUBLIC_REGISTRATION=false`), solo login con contraseña y sin SMTP.

## Archivos

| Archivo | En git | Contenido |
|---|---|---|
| `docker-compose.yml` | sí | Definición del stack |
| `.env.example`, `.env.taskview.example` | sí | Plantillas de configuración |
| `.env` | **no** | Versión, puertos y credenciales de Postgres |
| `.env.taskview` | **no** | Secretos de la API (`JWT_SIGN`, `ENCRYPTION_KEY`) y opciones |
| `init.ps1` | sí | Crea los `.env` con secretos aleatorios (no pisa los existentes) |
| `backup.ps1` / `restore.ps1` | sí | Respaldo y restauración de la base de datos |
| `backups/` | **no** | Respaldos `.dump` |

> Guarda una copia de `.env` y `.env.taskview` fuera del repo (gestor de contraseñas). Sin `ENCRYPTION_KEY` las integraciones con GitHub/GitLab quedan ilegibles, y sin `POSTGRES_PASSWORD` no podrás reconectar con el volumen existente.

## Primera instalación

Requisitos: Docker Desktop en marcha. Todos los comandos se ejecutan en PowerShell dentro de `deploy\`.

```powershell
cd D:\Proyectos\taskview-community\deploy
.\init.ps1
docker compose up -d
```

Luego abre http://localhost:8888 y entra con el usuario que crea la migración: login `user`, contraseña `user1!#Q`.

**Reclama esa cuenta enseguida** (sus credenciales son públicas): *Account settings* → tarjeta **Login and email** → pon tu login, correo y una contraseña fuerte, confirma con `user1!#Q` y pulsa **Save and sign out**. Tus proyectos y permisos se conservan.

## Uso diario

```powershell
cd D:\Proyectos\taskview-community\deploy
docker compose ps                        # estado
docker compose logs -f taskview-api-server   # logs de la API
docker compose stop                      # apagar (los datos quedan)
docker compose start                     # encender
```

Los servicios tienen `restart: unless-stopped`: si Docker Desktop está configurado para arrancar con Windows (*Settings → General → Start Docker Desktop when you sign in*), TaskView vuelve solo tras reiniciar el equipo.

## Conectar Claude (MCP)

1. En TaskView: *Account settings* → **API tokens** → crea un token (`tvk_...`) con los permisos y proyectos mínimos que necesite el asistente.
2. Registra el servidor en Claude Code (a nivel de usuario, disponible en todos los proyectos):

   ```powershell
   claude mcp add --scope user --transport http taskview http://localhost:3100/mcp --header "Authorization: Bearer tvk_TU_TOKEN"
   ```

   O en un `.mcp.json` de proyecto:

   ```json
   {
     "mcpServers": {
       "taskview": {
         "type": "http",
         "url": "http://localhost:3100/mcp",
         "headers": { "Authorization": "Bearer tvk_TU_TOKEN" }
       }
     }
   }
   ```

3. Comprueba con `claude mcp list` y pide algo como *"lista mis proyectos de TaskView"*.

El token no se guarda en el servidor MCP: cada petición viaja con el del cliente, y el asistente nunca supera los permisos de tu rol. Detalles: [docs/3.integrations/2.mcp.md](../docs/3.integrations/2.mcp.md).

> Clientes en la nube (claude.ai, conectores de Claude Desktop) usan OAuth y necesitan una URL pública con HTTPS; no aplica a esta instalación local.

## Respaldos

```powershell
.\backup.ps1            # crea backups\taskview-AAAAMMDD-HHMMSS.dump y conserva los 30 más recientes
.\backup.ps1 -Keep 60   # conserva más
```

Haz uno **antes de cada actualización**. Para automatizarlo, una tarea programada de Windows diaria:

```powershell
$a = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -ExecutionPolicy Bypass -File D:\Proyectos\taskview-community\deploy\backup.ps1' -WorkingDirectory 'D:\Proyectos\taskview-community\deploy'
Register-ScheduledTask -TaskName 'TaskView backup' -Action $a -Trigger (New-ScheduledTaskTrigger -Daily -At 13:00)
```

`backups\` está en el disco local: cópialo también a otro sitio (OneDrive, NAS) para no perderlo junto con el equipo.

### Restaurar

```powershell
.\restore.ps1 backups\taskview-20261015-151437.dump
```

Pide confirmación escribiendo `SI`, hace primero un respaldo del estado actual, detiene la API y el MCP, restaura y los vuelve a levantar.

## Actualizar TaskView

1. Revisa las [notas de la versión](https://github.com/Gimanh/taskview-community/releases).
2. `.\backup.ps1`
3. Cambia `TASKVIEW_VERSION` en `.env`.
4. `docker compose pull; docker compose up -d` (la migración aplica los cambios de esquema sola).

Para traer cambios del repo original a este fork: botón **Sync fork** en GitHub, o `git fetch upstream` con `upstream = https://github.com/Gimanh/taskview-community.git`.

## Cuidado

| Comando | Efecto |
|---|---|
| `docker compose down` | Seguro: borra contenedores y redes, **conserva** los datos |
| `docker compose down -v` | **Borra el volumen y todos los datos** |
| `docker volume rm taskview_pgdata` | **Borra todos los datos** |
| `docker system prune --volumes` | Puede borrar el volumen si el stack está bajado |

## Problemas comunes

- **Puerto ocupado:** cambia `WEB_PORT`, `API_PORT` o `MCP_PORT` en `.env`. Si cambias `WEB_PORT`, actualiza también `APP_URL` y `CORS_ALLOWED_ORIGINS` en `.env.taskview`.
- **La web carga pero no inicia sesión:** `docker compose logs taskview-api-server`; revisa que `migration` terminó con `Exited (0)` en `docker compose ps -a`.
- **Cambié algo en `.env.taskview`:** `docker compose up -d` recrea la API con la nueva configuración.
- **Referencia de variables:** [docs/4.configuration/1.environment-variables.md](../docs/4.configuration/1.environment-variables.md).
