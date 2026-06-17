# Blog4Devs — Junior Senior QA

Plataforma comunitaria de preguntas y respuestas técnicas para desarrolladores.
Los seniors validados responden; el contenido se indexa en Google con Schema.org.

## Arquitectura

```
Blog4Devs/
├── backend-fastapi/   FastAPI + MongoDB (Motor async)
├── frontend-next/     Next.js 15 con ISR y microdata SEO
├── docker-compose.yml Orquestación completa (mongo + backend + frontend)
└── .github/workflows/ CI con lint, type-check y tests
```

## Levantar el proyecto (Docker)

```bash
cp backend-fastapi/.env.example backend-fastapi/.env   # ajusta las variables
docker compose up --build
```

| Servicio   | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost:3000      |
| Backend    | http://localhost:8000      |
| API docs   | http://localhost:8000/docs |

## Desarrollo local

### Backend

Requiere Python 3.11+ y MongoDB corriendo en `localhost:27017`.

```bash
cd backend-fastapi
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload
```

### Frontend

Requiere Node.js 22+.

```bash
cd frontend-next
npm install
cp .env.local.example .env.local
npm run dev
```

## Variables de entorno

### Backend (`backend-fastapi/.env`)

| Variable | Default | Descripción |
|---|---|---|
| `APP_NAME` | `blog4devs API` | Nombre mostrado en /docs |
| `ENVIRONMENT` | `local` | `local` / `production` |
| `MONGODB_URI` | `mongodb://localhost:27017` | Cadena de conexión MongoDB |
| `MONGODB_DATABASE` | `community_qa` | Nombre de la base de datos |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | Origen permitido por CORS |
| `N8N_QUESTION_CREATED_WEBHOOK_URL` | _(vacío)_ | Webhook n8n opcional |
| `N8N_WEBHOOK_TIMEOUT_SECONDS` | `5` | Timeout del webhook en segundos |

### Frontend (`frontend-next/.env.local`)

| Variable | Default | Descripción |
|---|---|---|
| `API_BASE_URL` | `http://localhost:8000` | URL del backend (server-side) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | URL pública del sitio |

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/healthz` | Estado del servidor |
| `POST` | `/questions/` | Crear una pregunta |
| `GET` | `/questions/{slug}` | Obtener pregunta por slug |
| `POST` | `/questions/{slug}/answers` | Agregar respuesta a una pregunta |

Documentación interactiva: `http://localhost:8000/docs`

## Tests

```bash
cd backend-fastapi

# Requiere MongoDB en localhost:27017
pytest tests/ -v

# Con base de datos alternativa
MONGODB_DATABASE=community_qa_test pytest tests/ -v
```

## CI

Cada push a `main` y cada PR ejecuta:

- **Backend:** `ruff check` + `pytest` con MongoDB de servicio
- **Frontend:** `tsc --noEmit` + `next lint`

## Mejoras futuras (backlog)

Decisiones diferidas a propósito, con su justificación:

### Respuestas en una colección separada (cuando crezca)

Hoy las respuestas van **embebidas** en el documento de la pregunta
(`questions.answers[]`), con `answers_count` denormalizado para los listados.
Es lo correcto para la escala actual: las lecturas traen pregunta + respuestas
en una sola consulta y la mayoría de preguntas tienen pocas respuestas.

**Cuándo migrar a una colección `answers` aparte:** cuando una pregunta empiece
a acumular **cientos** de respuestas (un documento Mongo no puede superar 16 MB,
y cada `$push` reescribe todo el array).

**Esbozo de la migración:**
1. Crear colección `answers` con índice `{ question_id, created_at }`.
2. Script de migración: mover cada `answers[]` embebido a documentos sueltos.
3. Endpoint paginado `GET /questions/{slug}/answers`.
4. Ajustar `add_answer`, `accept_answer` y el cálculo de `answers_count`.
5. El frontend del detalle carga las respuestas por separado (paginadas).

### Otras decisiones (mantenidas a propósito)

- **`get_current_user` consulta Mongo por request:** se mantiene (no se confía
  solo en los claims del JWT) para que los cambios de rol y la **revocación de
  sesiones** surtan efecto al instante. La consulta es por `_id` (barata).
- **`count_documents` en los listados:** se mantiene; no hay UI de paginación
  que justifique pasar a paginación por cursor todavía.
