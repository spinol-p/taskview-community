# Guía de uso de TaskView: refactor del backend de Toteat

Cómo usar TaskView en el día a día. Los ejemplos salen del backlog de **prueba** del refactor de Toteat, que se puede recargar con `deploy\demo\toteat-demo.mjs` (sección 7). Instalación y operación del servidor: [README.md](README.md).

> **Estado actual (15-10-2026):** instancia limpia, sin datos de prueba ni tokens, y sin MCP registrado en Claude Code. Para el alta real sigue [Checklist del ingreso real](#checklist-del-ingreso-real).

## 1. Si vienes de Jira

| Jira | TaskView | En el proyecto de prueba |
|---|---|---|
| Proyecto | **Proyecto** (en la API se llama *goal*) | `Toteat · Refactor Backend [PRUEBA]` |
| Épica | **Lista** dentro del proyecto | `E0 · Diagnóstico…` a `E5 · Seguridad…` |
| Historia / tarea | **Tarea** | 31 tareas |
| Sub-tarea | **Subtarea** | 13 subtareas en las tareas grandes |
| Estado / columna del board | **Columna Kanban** (propia de cada proyecto) | Backlog → Por hacer → En progreso → En revisión → Bloqueado → Hecho |
| Labels / componentes | **Etiquetas** | `latencia`, `mongodb`, `postgresql`, `monolito`, `riesgo-prod`… |
| Prioridad | **Prioridad** baja / media / alta | |
| Story points | **Estimación** (puntos) | 1 a 13 |
| Sprint | **Sprint** (con burndown, velocidad y retro) | Sprint 1 (activo) y Sprint 2 (planificado) |
| "is blocked by" | **Dependencia** en la vista **Gráfico** | 23 dependencias |
| Descripción | **Nota** en Markdown | Criterios de aceptación y contexto |
| Tempo / worklog | **Registro de tiempo** | |

## 2. Primeros pasos

1. Entra en http://localhost:8888.
2. **Pon la interfaz en español:** menú de usuario (abajo a la izquierda) → **Idioma** → Español.
3. **Abre el proyecto:** barra lateral → selector de proyecto → *Toteat · Refactor Backend [PRUEBA]*.
4. Desde el menú del proyecto cambias de vista:

| Vista | Para qué sirve en el refactor |
|---|---|
| **Lista** | Ver tareas por épica, filtrar por etiqueta, prioridad o responsable y ordenar |
| **Kanban** | El tablero del día: arrastra tarjetas entre columnas |
| **Gráfico** | Mapa de dependencias: qué bloquea a qué (p. ej. ADR → modelo relacional → repositorios → CDC → migración → ACID → cutover) |
| **Calendario** | Fechas límite de la semana |
| **Sprints** | Planificar, activar y cerrar sprints; burndown, velocidad y retro |
| **Analíticas** | Carga por persona, tiempos por columna (cuellos de botella), throughput |
| **Informes de tiempo** | Horas por tarea, persona o proyecto |

La pantalla **Main** muestra *Hoy*, *Próximas* (con fecha límite) y *Tareas recientes* de todos tus proyectos.

## 3. El backlog de prueba

Está pensado como un plan realista para sacar a Toteat de MVP sin detener la producción:

- **E0 · Diagnóstico y línea base:** medir antes de tocar (OpenTelemetry, p95/p99, profiler de Mongo, SLOs).
- **E1 · Quick wins de latencia:** índices, N+1, caché Redis, pool de conexiones, reportes en una réplica.
- **E2 · MongoDB → PostgreSQL:** ADR, modelo relacional, repositorios, CDC, migración histórica, pagos y caja ACID, cutover con feature flags.
- **E3 · Monolito → servicios (strangler fig):** bounded contexts, API Gateway, bus de eventos, extraer Pagos y Pedidos.
- **E4 · Calidad y CI/CD:** tests de caracterización (red de seguridad), CI, k6, alertas por SLO, canary.
- **E5 · Seguridad y operación:** secretos, rate limiting, restaurar backups, runbook.

El **Sprint 1** (activo) cubre diagnóstico y quick wins. La tarea *"Sacar secretos del repositorio"* está en **Bloqueado**, con el motivo en su nota, para que veas cómo se refleja un bloqueo.

## 4. Rutina de trabajo

**Inicio de sprint (planning)**
1. *Sprints* → crea o elige el sprint → define objetivo y capacidad (puntos).
2. Arrastra tareas del backlog al sprint y comprueba que la suma de puntos no supere la capacidad.
3. **Activar** el sprint.

**Cada día**
1. Abre **Kanban** filtrado por tu usuario.
2. Mueve lo que empiezas a *En progreso* e inicia el **temporizador** en la tarea para registrar tiempo.
3. Si algo se traba: muévelo a *Bloqueado* y escribe en la nota **por qué** y **qué falta**.
4. Al abrir un PR: pasa la tarea a *En revisión* y pega el enlace del PR en la nota.
5. Al mergear y desplegar: *Hecho* y marca la tarea como completada.

**Fin de sprint**
1. *Sprints* → **Revisión** → **Cerrar** (lo no terminado pasa al siguiente sprint o al backlog).
2. Revisa el burndown y la velocidad, y escribe la **retro** en el propio sprint.

## 5. Buenas prácticas para el refactor

- **Una tarea = un entregable desplegable.** Si no cabe en 2 o 3 días (más de 8 puntos), divídela en subtareas o en varias tareas.
- **Título con verbo:** "Crear índices…", "Extraer servicio…".
- **Nota con criterio de aceptación:** cómo sabremos que está hecha (p. ej. "p95 de crear pedido < 300 ms en hora punta").
- **Etiqueta `riesgo-prod`** en todo lo que toque datos o flujos de clientes reales: exige plan de rollback.
- **Dependencias en el Gráfico** antes de planificar: no metas en un sprint algo cuyo predecesor no está hecho.
- **Prioridad alta solo para lo que bloquea u opera en producción;** si todo es alta, nada lo es.

## 6. Administrar con IA (Claude por MCP)

### Conectar (una vez)

1. TaskView → *Configuración de la cuenta* → **API tokens** → crea un token con acceso al proyecto y los permisos necesarios.
2. En una terminal:

   ```powershell
   claude mcp add --scope user --transport http taskview http://localhost:3100/mcp --header "Authorization: Bearer tvk_TU_TOKEN"
   ```

3. Abre una sesión nueva de Claude Code y comprueba con `claude mcp list`.

### Qué le puedes pedir

| Pedido | Herramientas que usa |
|---|---|
| "¿Qué tengo para hoy y qué está bloqueado en Toteat?" | `get_agenda`, `list_tasks` |
| "Crea en E1 una tarea para cachear la carta con Redis, prioridad media, 5 puntos, etiqueta latencia" | `create_task`, `toggle_task_tag` |
| "Divide 'Diseñar modelo relacional' en subtareas por tabla" | `create_task` con tarea padre |
| "Mueve 'Crear índices compuestos' a En revisión y asígnamela" | `update_task`, `toggle_task_assignees` |
| "¿Qué tareas dependen de la migración histórica?" | `list_task_dependencies` |
| "Registra 2 h en 'Instrumentar OpenTelemetry'" | `log_time`, `start_timer`, `stop_timer` |
| "Resume el avance de E2 y lo que falta para el cutover" | `list_lists`, `list_tasks` |
| "Lee este análisis de un incidente y crea las tareas de seguimiento" | `create_task`, `create_tag` |

El MCP **no gestiona sprints**: planifícalos y ciérralos desde la web. El asistente nunca supera los permisos de su token ni los de tu rol.

### Flujo recomendado con IA

- **Al empezar el día:** "dame mi agenda de TaskView y sugiéreme el orden según dependencias y prioridad".
- **Mientras programas en el repo de Toteat:** "cuando termines este cambio, pasa la tarea X a En revisión y añade el enlace del PR".
- **Tras un análisis** (p. ej. los resultados del profiler de Mongo): "crea una tarea por cada consulta lenta con su `explain()` en la nota".

## 7. Recargar o borrar los datos de prueba

```powershell
cd D:\Proyectos\taskview-community
node deploy\demo\toteat-demo.mjs            # crea el proyecto de prueba (no hace nada si ya existe)
node deploy\demo\toteat-demo.mjs --delete   # lo borra con todas sus tareas, listas, etiquetas y sprints
```

> **No lo ejecutes en la instancia de uso real** salvo que quieras un proyecto de práctica: crea datos inventados en tu cuenta. Si lo usas, bórralo después con `--delete`.

Recrear el proyecto le asigna un **id nuevo**, así que un token limitado al id anterior dejará de verlo: edita el token en *API tokens* para incluir el proyecto nuevo.

Si ya cambiaste el usuario de fábrica, pasa tus credenciales o un token:

```powershell
$env:TASKVIEW_TOKEN = 'tvk_...'; node deploy\demo\toteat-demo.mjs --delete
```

## Checklist del ingreso real

La instancia quedó vacía el 15-10-2026: base de datos nueva (solo *Inbox* y el usuario de fábrica), sin respaldos de prueba, sin tokens y sin MCP registrado. Los secretos de `.env` y `.env.taskview` se conservan. Pasos en orden:

**1. Servidor**
- [ ] Docker Desktop abierto (o activa *Settings → General → Start Docker Desktop when you sign in*).
- [ ] `cd D:\Proyectos\taskview-community\deploy; docker compose ps`: `db`, `taskview-api-server`, `taskview-webapp` y `taskview-mcp` en *running*; `migration` en *Exited (0)*.

**2. Tu cuenta** (antes que nada: las credenciales de fábrica son públicas)
- [ ] http://localhost:8888 → login `user` / `user1!#Q`.
- [ ] *Configuración de la cuenta* → **Login and email** → tu login, tu correo y una contraseña fuerte → **Save and sign out** → vuelve a entrar.
- [ ] Menú de usuario → **Idioma** → Español.
- [ ] Renombra la organización *"user's workspace"* (p. ej. "Toteat") en *Organizaciones*.

**3. Proyecto real**
- [ ] Crea el proyecto (p. ej. *Toteat · Backend*).
- [ ] Columnas Kanban: el proyecto nace con *TODO / In Progress / Done*; renómbralas y añade las que falten (Backlog, Por hacer, En progreso, En revisión, Bloqueado, Hecho).
- [ ] Listas por épica y etiquetas (`latencia`, `mongodb`, `postgresql`, `monolito`, `riesgo-prod`…). La sección 3 y `deploy\demo\toteat-demo.mjs` sirven de referencia.
- [ ] Primer sprint en *Sprints*, con objetivo y capacidad.

**4. Claude (MCP)**
- [ ] *Configuración de la cuenta* → **API tokens** → token limitado al proyecto real, sin `goal_can_delete` ni `goal_can_manage_users`, y con caducidad.
- [ ] Registrar en Claude Code (sección 6): `claude mcp add --scope user --transport http taskview http://localhost:3100/mcp --header "Authorization: Bearer tvk_..."`.
- [ ] Sesión nueva de Claude Code → `claude mcp list` muestra *taskview ✔ Connected* → prueba: "lista mis proyectos de TaskView".
- [ ] Opcional: pedirle a Claude que cargue el backlog inicial a partir del análisis real del backend de Toteat.

**5. Respaldos**
- [ ] `.\backup.ps1` tras cargar lo inicial.
- [ ] Tarea programada diaria (ver [README](README.md#respaldos)) y copia de `deploy\backups\`, `.env` y `.env.taskview` fuera del equipo.

> Esta instalación escucha solo en `127.0.0.1`: es para tu uso personal. Para que entre el equipo hace falta publicarla en un servidor con HTTPS (ver `docs/7.guides/1.deploy-vps-nginx.md`) y configurar SMTP para las invitaciones.

## Problemas conocidos

- **En *Main → Próximas* una tarea puede aparecer agrupada un día antes** de su fecha (p. ej. vence el 18 y sale bajo "17 Oct"). La fecha guardada es correcta y la etiqueta de la tarea muestra el día bueno. Es un desfase de zona horaria de la web de TaskView (Chile, UTC−3), no un error de los datos.
