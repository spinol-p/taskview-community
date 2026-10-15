// Carga un backlog de PRUEBA para el refactor del backend de Toteat en TaskView.
// Todo queda dentro de un único proyecto, así que borrarlo elimina todos los datos de prueba.
//
//   node deploy/demo/toteat-demo.mjs            crea el proyecto (si ya existe, no hace nada)
//   node deploy/demo/toteat-demo.mjs --delete   borra el proyecto y todo su contenido
//
// Autenticación (variables de entorno):
//   TASKVIEW_TOKEN=tvk_...                         token de API, o bien
//   TASKVIEW_LOGIN / TASKVIEW_PASSWORD             usuario y contraseña (por defecto el usuario de fábrica)
//   TASKVIEW_URL                                    por defecto http://127.0.0.1:1725

const API = process.env.TASKVIEW_URL ?? 'http://127.0.0.1:1725';
const PROJECT_NAME = 'Toteat · Refactor Backend [PRUEBA]';

async function authHeader() {
    if (process.env.TASKVIEW_TOKEN) return `Bearer ${process.env.TASKVIEW_TOKEN}`;
    const res = await fetch(`${API}/module/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            login: process.env.TASKVIEW_LOGIN ?? 'user',
            password: process.env.TASKVIEW_PASSWORD ?? 'user1!#Q',
        }),
    });
    const body = await res.json();
    if (!body.access) throw new Error(`Login fallido (${res.status}): ${JSON.stringify(body)}`);
    return `Bearer ${body.access}`;
}

const AUTH = await authHeader();

async function call(method, path, body) {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: { 'content-type': 'application/json', authorization: AUTH },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 400)}`);
    return JSON.parse(text).response;
}

const goals = await call('GET', '/module/goals');
const existing = goals.find((g) => g.name === PROJECT_NAME);

if (process.argv.includes('--delete')) {
    if (!existing) { console.log('No existe el proyecto de prueba; nada que borrar.'); process.exit(0); }
    await call('DELETE', '/module/goals', { goalId: existing.id });
    console.log(`Proyecto "${PROJECT_NAME}" (id ${existing.id}) borrado con todo su contenido.`);
    process.exit(0);
}
if (existing) { console.log(`Ya existe "${PROJECT_NAME}" (id ${existing.id}). Usa --delete para recrearlo.`); process.exit(0); }

// ---------------------------------------------------------------------------
// Datos del backlog (inventados a partir del contexto: MVP en producción con clientes reales,
// latencia alta, MongoDB sin modelo transaccional, monolito).
// ---------------------------------------------------------------------------

const DESCRIPTION = [
    'Backlog de PRUEBA para evaluar TaskView. Se eliminará al dejar la plataforma lista.',
    '',
    'Contexto: el backend de Toteat nació como MVP y hoy opera en producción con clientes reales.',
    'Problemas: latencia alta en horas punta, MongoDB no se adecua al modelo transaccional',
    '(pagos, cierres de caja, inventario), monolito acoplado, poca observabilidad y sin red de tests.',
    '',
    'Objetivo: llevarlo a un producto real sin detener la operación (estrategia strangler fig).',
].join('\n');

const COLUMNS = ['Backlog', 'Por hacer', 'En progreso', 'En revisión', 'Bloqueado', 'Hecho'];

const TAGS = {
    latencia: '#f97316',
    mongodb: '#16a34a',
    postgresql: '#2563eb',
    monolito: '#7c3aed',
    observabilidad: '#0891b2',
    seguridad: '#dc2626',
    'riesgo-prod': '#be123c',
    'deuda-tecnica': '#a16207',
    infra: '#475569',
    'quick-win': '#65a30d',
};

// prio: 3 alta, 2 media, 1 baja. pts: story points. col: columna Kanban. sprint: 1 | 2.
// due: días desde hoy. done: tarea completada. key: identificador para dependencias (deps).
const EPICS = [
    {
        list: 'E0 · Diagnóstico y línea base',
        description: 'Entender el sistema y medirlo antes de tocarlo.',
        tasks: [
            {
                key: 'mapa', title: 'Mapear dominios, endpoints y dependencias del monolito', prio: 3, pts: 5,
                tags: ['monolito'], col: 'Hecho', done: true, sprint: 1,
                note: '## Entregable\n- Inventario de endpoints con tráfico real (últimos 30 días)\n- Diagrama C4 nivel 2\n- Mapa de colecciones Mongo por dominio\n\n## Criterio de aceptación\nRevisado con el equipo y publicado en la wiki.',
                subtasks: ['Inventario de endpoints desde logs del balanceador', 'Mapa de colecciones Mongo y quién las escribe', 'Diagrama C4 (contexto y contenedores)'],
            },
            {
                key: 'apm', title: 'Instrumentar trazas distribuidas con OpenTelemetry', prio: 3, pts: 5,
                tags: ['observabilidad', 'latencia'], col: 'En progreso', sprint: 1, due: 6,
                note: '## Alcance\n- SDK OTel en el monolito (HTTP, Mongo driver, colas)\n- Exportar a Grafana Tempo / Datadog\n- Muestreo 10% en producción, 100% en errores',
                subtasks: ['Auto-instrumentación HTTP y driver de Mongo', 'Propagar trace-id a logs', 'Validar overhead < 3% en staging'],
            },
            {
                key: 'baseline', title: 'Medir línea base de latencia p50/p95/p99 por endpoint crítico', prio: 3, pts: 3,
                tags: ['latencia', 'observabilidad'], col: 'Por hacer', sprint: 1, due: 9, deps: ['apm'],
                note: 'Endpoints críticos: crear pedido, enviar comanda a cocina, pagar, cerrar caja, cargar carta.\nMedir en hora punta (13-15 h y 20-23 h).',
            },
            {
                key: 'slow', title: 'Identificar las 10 consultas más lentas de MongoDB (profiler)', prio: 3, pts: 2,
                tags: ['mongodb', 'latencia'], col: 'En revisión', sprint: 1, due: 4,
                note: 'Activar `db.setProfilingLevel(1, { slowms: 100 })` en una réplica secundaria; nunca en el primario.',
            },
            {
                key: 'slo', title: 'Definir SLOs y presupuesto de error con negocio', prio: 2, pts: 2,
                tags: ['observabilidad'], col: 'Backlog', sprint: 1, due: 12, deps: ['baseline'],
                note: 'Propuesta inicial: p95 < 300 ms en crear pedido y pagar; disponibilidad 99,9 % mensual.',
            },
        ],
    },
    {
        list: 'E1 · Estabilización y quick wins de latencia',
        description: 'Bajar la latencia ya, sin cambios de arquitectura.',
        tasks: [
            {
                key: 'idx', title: 'Crear índices compuestos en órdenes, mesas y pagos', prio: 3, pts: 3,
                tags: ['mongodb', 'latencia', 'quick-win'], col: 'Por hacer', sprint: 1, due: 8, deps: ['slow'],
                note: 'Crear con `{ background: true }` fuera de hora punta. Validar con `explain()` antes y después.',
                subtasks: ['orders: { restaurantId, status, createdAt }', 'payments: { orderId }', 'tables: { restaurantId, state }'],
            },
            {
                key: 'n1', title: 'Eliminar consultas N+1 al cargar comanda y carta', prio: 3, pts: 5,
                tags: ['latencia', 'deuda-tecnica'], col: 'Por hacer', sprint: 1, deps: ['slow'],
            },
            {
                key: 'cache', title: 'Caché Redis para carta, precios y configuración de locales', prio: 2, pts: 5,
                tags: ['latencia', 'infra'], col: 'Backlog', sprint: 2,
                note: 'Invalidación por evento al editar la carta. TTL de respaldo: 10 min.',
            },
            {
                key: 'pool', title: 'Ajustar pool de conexiones y timeouts del driver de Mongo', prio: 2, pts: 1,
                tags: ['mongodb', 'quick-win'], col: 'Hecho', done: true, sprint: 1,
            },
            {
                key: 'reports', title: 'Paginar y mover reportes de ventas a una réplica de lectura', prio: 2, pts: 3,
                tags: ['latencia', 'mongodb'], col: 'Backlog', sprint: 2,
                note: 'Los reportes de fin de mes bloquean el primario y degradan la toma de pedidos.',
            },
        ],
    },
    {
        list: 'E2 · Migración de MongoDB a PostgreSQL',
        description: 'Modelo transaccional (ACID) para pedidos, pagos, caja e inventario.',
        tasks: [
            {
                key: 'adr', title: 'ADR: PostgreSQL como base transaccional y estrategia de migración', prio: 3, pts: 2,
                tags: ['postgresql', 'mongodb'], col: 'En revisión', sprint: 1, due: 5,
                note: '## Opciones evaluadas\n1. Mantener Mongo con transacciones multi-documento\n2. PostgreSQL + migración por dominio con CDC\n3. Reescritura completa\n\n**Decisión propuesta:** opción 2.',
            },
            {
                key: 'model', title: 'Diseñar modelo relacional: pedidos, pagos, cajas e inventario', prio: 3, pts: 8,
                tags: ['postgresql'], col: 'Por hacer', sprint: 2, deps: ['adr', 'mapa'],
                subtasks: ['Esquema de pedidos y líneas de pedido', 'Pagos, propinas y medios de pago', 'Apertura y cierre de caja', 'Movimientos de inventario'],
            },
            {
                key: 'repo', title: 'Capa de repositorios (ports & adapters) para desacoplar el acceso a datos', prio: 3, pts: 8,
                tags: ['deuda-tecnica', 'monolito'], col: 'Backlog', sprint: 2, deps: ['model'],
            },
            {
                key: 'cdc', title: 'Replicación Mongo → PostgreSQL con CDC (Debezium) o dual-write', prio: 3, pts: 8,
                tags: ['postgresql', 'mongodb', 'riesgo-prod'], col: 'Backlog', deps: ['repo'],
            },
            {
                key: 'hist', title: 'Migrar datos históricos y script de reconciliación diaria', prio: 2, pts: 5,
                tags: ['postgresql', 'mongodb'], col: 'Backlog', deps: ['cdc'],
            },
            {
                key: 'acid', title: 'Mover pagos y cierre de caja a transacciones ACID', prio: 3, pts: 8,
                tags: ['postgresql', 'riesgo-prod'], col: 'Backlog', deps: ['hist'],
                note: 'Hoy un fallo entre "registrar pago" y "cerrar mesa" deja estados inconsistentes que soporte corrige a mano.',
            },
            {
                key: 'cutover', title: 'Cutover por dominio con feature flags y plan de rollback', prio: 3, pts: 5,
                tags: ['riesgo-prod', 'infra'], col: 'Backlog', deps: ['acid', 'contract'],
            },
        ],
    },
    {
        list: 'E3 · Descomposición del monolito (strangler fig)',
        description: 'Extraer servicios por dominio sin detener la operación.',
        tasks: [
            {
                key: 'bc', title: 'Definir bounded contexts y contratos entre dominios', prio: 2, pts: 5,
                tags: ['monolito'], col: 'Backlog', sprint: 2, deps: ['mapa'],
            },
            {
                key: 'gw', title: 'API Gateway con enrutamiento strangler', prio: 2, pts: 5,
                tags: ['monolito', 'infra'], col: 'Backlog', deps: ['bc'],
            },
            {
                key: 'events', title: 'Bus de eventos asíncrono para comandas y notificaciones', prio: 2, pts: 8,
                tags: ['monolito', 'infra'], col: 'Backlog', deps: ['bc'],
            },
            {
                key: 'svc-pay', title: 'Extraer servicio de Pagos', prio: 3, pts: 13,
                tags: ['monolito', 'riesgo-prod'], col: 'Backlog', deps: ['gw', 'acid', 'contract'],
            },
            {
                key: 'svc-orders', title: 'Extraer servicio de Pedidos y Comandas', prio: 2, pts: 13,
                tags: ['monolito'], col: 'Backlog', deps: ['gw', 'events'],
            },
        ],
    },
    {
        list: 'E4 · Calidad, CI/CD y despliegue',
        description: 'Red de seguridad para refactorizar en producción.',
        tasks: [
            {
                key: 'contract', title: 'Tests de caracterización y contrato sobre endpoints críticos', prio: 3, pts: 8,
                tags: ['deuda-tecnica', 'riesgo-prod'], col: 'En progreso', sprint: 1, due: 10,
                note: 'Antes de mover nada: congelar el comportamiento actual (golden master) de crear pedido, pagar y cerrar caja.',
            },
            {
                key: 'ci', title: 'Pipeline CI: tests, lint y análisis estático obligatorios en PR', prio: 2, pts: 3,
                tags: ['infra', 'quick-win'], col: 'Por hacer', sprint: 1,
            },
            {
                key: 'k6', title: 'Pruebas de carga con k6 simulando hora punta', prio: 2, pts: 5,
                tags: ['latencia', 'infra'], col: 'Backlog', sprint: 2, deps: ['baseline'],
            },
            {
                key: 'alerts', title: 'Dashboards y alertas por SLO', prio: 2, pts: 3,
                tags: ['observabilidad'], col: 'Backlog', sprint: 2, deps: ['slo'],
            },
            {
                key: 'canary', title: 'Despliegues canary / blue-green con rollback automático', prio: 2, pts: 5,
                tags: ['infra', 'riesgo-prod'], col: 'Backlog', deps: ['alerts'],
            },
        ],
    },
    {
        list: 'E5 · Seguridad y operación',
        description: 'Higiene operativa mínima para un producto con clientes reales.',
        tasks: [
            {
                key: 'secrets', title: 'Sacar secretos del repositorio y rotarlos', prio: 3, pts: 2,
                tags: ['seguridad', 'quick-win'], col: 'Bloqueado', sprint: 1, due: 3,
                note: '**Bloqueado:** esperando acceso al gestor de secretos del proveedor cloud.',
            },
            { key: 'rate', title: 'Rate limiting por cliente en la API pública', prio: 2, pts: 3, tags: ['seguridad', 'latencia'], col: 'Backlog' },
            {
                key: 'backup', title: 'Probar restauración de backups de MongoDB (RPO/RTO reales)', prio: 3, pts: 2,
                tags: ['mongodb', 'riesgo-prod'], col: 'Por hacer', sprint: 1, due: 7,
            },
            { key: 'runbook', title: 'Runbook de incidentes y guardia', prio: 1, pts: 2, tags: ['observabilidad'], col: 'Backlog' },
        ],
    },
];

// ---------------------------------------------------------------------------

const day = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
};

const goal = await call('POST', '/module/goals', { name: PROJECT_NAME, description: DESCRIPTION, color: '#f97316' });
console.log(`Proyecto creado: ${goal.name} (id ${goal.id})`);

// Columnas Kanban: el proyecto nace con TODO / In Progress / Done; se renombran en orden y se añaden las que faltan
const existingCols = (await call('POST', '/module/kanban/fetch-statuses', { goalId: goal.id }))
    .sort((a, b) => a.viewOrder - b.viewOrder);
const colId = {};
for (const [i, name] of COLUMNS.entries()) {
    const col = existingCols[i];
    if (col) {
        await call('POST', '/module/kanban/update-status', { id: col.id, name });
        colId[name] = col.id;
    } else {
        colId[name] = (await call('POST', '/module/kanban/add-status', { goalId: goal.id, name })).id;
    }
}

const tagId = {};
for (const [name, color] of Object.entries(TAGS)) {
    tagId[name] = (await call('POST', '/module/tags', { name, color, goalId: goal.id })).id;
}

// Sprints: el 1 empieza el próximo lunes, de dos semanas
const nextMonday = (8 - new Date().getDay()) % 7 || 7;
const sprintIds = {
    1: (await call('POST', '/module/sprints', {
        goalId: goal.id, name: 'Sprint 1 · Diagnóstico y quick wins',
        startDate: day(nextMonday - 7), endDate: day(nextMonday + 4), capacity: 30,
        goalText: 'Tener línea base de latencia medida y aplicar los primeros quick wins.',
    })).id,
    2: (await call('POST', '/module/sprints', {
        goalId: goal.id, name: 'Sprint 2 · Modelo relacional y caché',
        startDate: day(nextMonday + 7), endDate: day(nextMonday + 18), capacity: 30,
        goalText: 'Modelo relacional aprobado y caché de carta en producción.',
    })).id,
};
await call('POST', `/module/sprints/sprint/${sprintIds[1]}/activate`, {});

const taskIds = {};
const pending = [];
let count = 0;
for (const epic of EPICS) {
    const list = await call('POST', '/module/goal_lists', { name: epic.list, description: epic.description, goalId: goal.id });
    for (const t of epic.tasks) {
        const task = await call('POST', '/module/tasks', {
            goalId: goal.id,
            goalListId: list.id,
            description: t.title,
            note: t.note ?? null,
            priorityId: t.prio,
            statusId: colId[t.col],
            estimateValue: t.pts,
            endDate: t.due !== undefined ? day(t.due) : null,
        });
        taskIds[t.key] = task.id;
        count++;
        if (t.done) await call('PATCH', '/module/tasks', { id: task.id, complete: true });
        for (const tag of t.tags ?? []) await call('PATCH', '/module/tags/toggle', { tagId: tagId[tag], taskId: task.id });
        if (t.sprint) await call('PATCH', `/module/sprints/task/${task.id}/sprint`, { sprintId: sprintIds[t.sprint] });
        if (t.col !== 'Backlog') await call('PATCH', '/module/tasks/task-users', { taskId: task.id, userIds: [goal.owner] });
        for (const sub of t.subtasks ?? []) {
            await call('POST', '/module/tasks', {
                goalId: goal.id, goalListId: list.id, parentId: task.id, description: sub,
                priorityId: t.prio, complete: Boolean(t.done),
            });
            count++;
        }
        for (const dep of t.deps ?? []) pending.push([dep, t.key]);
    }
}

// Dependencias: arista origen -> destino = "destino depende de origen"
for (const [from, to] of pending) {
    await call('POST', '/module/graph', { source: taskIds[from], target: taskIds[to] });
}

console.log(`Listo: ${EPICS.length} listas, ${count} tareas (incluye subtareas), ${Object.keys(TAGS).length} etiquetas, 2 sprints, ${pending.length} dependencias.`);
console.log('Abre http://localhost:8888 y elige el proyecto en "Select project".');
