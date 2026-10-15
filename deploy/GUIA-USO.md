# Guía de uso de TaskView

Cómo usar TaskView en el día a día para gestionar proyectos de desarrollo, también desde Claude por MCP. Instalación y operación del servidor: [README.md](README.md).

## 1. Si vienes de Jira

| Jira | TaskView |
|---|---|
| Proyecto | **Proyecto** (en la API se llama *goal*) |
| Épica | **Lista** dentro del proyecto |
| Historia / tarea | **Tarea** |
| Sub-tarea | **Subtarea** |
| Estado / columna del board | **Columna Kanban** (propia de cada proyecto) |
| Labels / componentes | **Etiquetas** |
| Prioridad | **Prioridad** baja / media / alta |
| Story points | **Estimación** (puntos) |
| Sprint | **Sprint** (con burndown, velocidad y retro) |
| "is blocked by" | **Dependencia** en la vista **Gráfico** |
| Descripción | **Nota** en Markdown |
| Tempo / worklog | **Registro de tiempo** |

## 2. Primeros pasos

1. Entra en http://localhost:8888.
2. **Pon la interfaz en español:** menú de usuario (abajo a la izquierda) → **Idioma** → Español.
3. **Abre un proyecto** desde el selector de la barra lateral.
4. Desde el menú del proyecto cambias de vista:

| Vista | Para qué sirve |
|---|---|
| **Lista** | Ver tareas por épica, filtrar por etiqueta, prioridad o responsable y ordenar |
| **Kanban** | El tablero del día: arrastra tarjetas entre columnas |
| **Gráfico** | Mapa de dependencias: qué bloquea a qué |
| **Calendario** | Fechas límite de la semana |
| **Sprints** | Planificar, activar y cerrar sprints; burndown, velocidad y retro |
| **Analíticas** | Carga por persona, tiempos por columna (cuellos de botella), throughput |
| **Informes de tiempo** | Horas por tarea, persona o proyecto |

La pantalla **Main** muestra *Hoy*, *Próximas* (con fecha límite) y *Tareas recientes* de todos tus proyectos.

## 3. Estructura recomendada de un proyecto

- **Columnas Kanban:** Backlog → Por hacer → En progreso → En revisión → Bloqueado → Hecho. El proyecto nace con *TODO / In Progress / Done*: renómbralas y añade las que falten.
- **Listas = épicas,** con prefijo de orden para que se ordenen solas: `E0 · Diagnóstico`, `E1 · …`.
- **Etiquetas** por área técnica y por riesgo, por ejemplo `latencia`, `base-de-datos`, `seguridad`, `deuda-tecnica`, `riesgo-prod`.
- **Sprints de dos semanas** con objetivo escrito y capacidad en puntos. *Auto-sprints* los genera con calendario fijo.

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

## 5. Buenas prácticas

- **Una tarea = un entregable desplegable.** Si no cabe en 2 o 3 días (más de 8 puntos), divídela en subtareas o en varias tareas.
- **Título con verbo:** "Crear índices…", "Extraer servicio…".
- **Nota con criterio de aceptación:** cómo sabremos que está hecha (p. ej. "p95 del endpoint < 300 ms bajo carga").
- **Etiqueta `riesgo-prod`** en todo lo que toque datos o flujos productivos: exige plan de rollback.
- **Dependencias en el Gráfico** antes de planificar: no metas en un sprint algo cuyo predecesor no está hecho.
- **Prioridad alta solo para lo que bloquea u opera en producción;** si todo es alta, nada lo es.

## 6. Administrar con IA (Claude por MCP)

### Conectar (una vez)

1. TaskView → *Configuración de la cuenta* → **API tokens** → crea un token limitado a los proyectos necesarios, sin `goal_can_delete` ni `goal_can_manage_users`, y con caducidad.
2. En una terminal:

   ```powershell
   claude mcp add --scope user --transport http taskview http://localhost:3100/mcp --header "Authorization: Bearer tvk_TU_TOKEN"
   ```

3. Abre una sesión nueva de Claude Code y comprueba con `claude mcp list`: debe aparecer *taskview ✔ Connected*.

### Qué le puedes pedir

| Pedido | Herramientas que usa |
|---|---|
| "¿Qué tengo para hoy y qué está bloqueado?" | `get_agenda`, `list_tasks` |
| "Crea en E1 una tarea para cachear el catálogo, prioridad media, 5 puntos, etiqueta latencia" | `create_task`, `toggle_task_tag` |
| "Divide 'Diseñar modelo de datos' en subtareas por tabla" | `create_task` con tarea padre |
| "Mueve 'Crear índices' a En revisión y asígnamela" | `update_task`, `toggle_task_assignees` |
| "¿Qué tareas dependen de la migración?" | `list_task_dependencies` |
| "Registra 2 h en 'Instrumentar trazas'" | `log_time`, `start_timer`, `stop_timer` |
| "Resume el avance de E2 y lo que falta" | `list_lists`, `list_tasks` |
| "Lee este análisis de un incidente y crea las tareas de seguimiento" | `create_task`, `create_tag` |

El MCP **no gestiona sprints**: planifícalos y ciérralos desde la web. El asistente nunca supera los permisos de su token ni los de tu rol.

### Flujo recomendado con IA

- **Al empezar el día:** "dame mi agenda de TaskView y sugiéreme el orden según dependencias y prioridad".
- **Mientras programas:** "cuando termines este cambio, pasa la tarea X a En revisión y añade el enlace del PR".
- **Tras un análisis** (profiler, logs, revisión de código): "crea una tarea por cada hallazgo con el detalle en la nota".

## 7. Datos privados

Este repositorio es público. Lo que sea de un proyecto o empresa concreta (backlogs de ejemplo, scripts de carga, notas) va en **`deploy/local/`**, que Git ignora igual que `.env`, `.env.taskview` y `backups/`.

## Checklist de puesta en marcha

**1. Servidor**
- [ ] Docker Desktop abierto (o activa *Settings → General → Start Docker Desktop when you sign in*).
- [ ] `cd deploy; docker compose ps`: `db`, `taskview-api-server`, `taskview-webapp` y `taskview-mcp` en *running*; `migration` en *Exited (0)*.

**2. Tu cuenta** (antes que nada: las credenciales de fábrica son públicas)
- [ ] http://localhost:8888 → login `user` / `user1!#Q`.
- [ ] *Configuración de la cuenta* → **Login and email** → tu login, tu correo y una contraseña fuerte → **Save and sign out** → vuelve a entrar.
- [ ] Menú de usuario → **Idioma** → Español.
- [ ] Renombra la organización *"user's workspace"* en *Organizaciones*.

**3. Primer proyecto**
- [ ] Crea el proyecto, sus columnas, listas y etiquetas (sección 3) y el primer sprint.

**4. Claude (MCP)**
- [ ] Token y registro del MCP (sección 6) → prueba: "lista mis proyectos de TaskView".

**5. Respaldos**
- [ ] `.\backup.ps1` tras cargar lo inicial.
- [ ] Tarea programada diaria (ver [README](README.md#respaldos)) y copia de `deploy\backups\`, `.env` y `.env.taskview` fuera del equipo.

> Esta instalación escucha solo en `127.0.0.1`: es para uso personal. Para que entre un equipo hace falta publicarla en un servidor con HTTPS (ver `docs/7.guides/1.deploy-vps-nginx.md`) y configurar SMTP para las invitaciones.

## Problemas conocidos

- **En *Main → Próximas* una tarea puede aparecer agrupada un día antes** de su fecha cuando tu zona horaria está detrás de UTC. La fecha guardada es correcta y la etiqueta de la tarea muestra el día bueno: es un desfase de la web de TaskView, no un error de los datos.
