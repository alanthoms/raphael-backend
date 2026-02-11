
Leonardo Ops Dashboard (Backend API)
A REST API for ACP and mission management with authentication, server-side filtering, and pagination.

Frontend Repo: https://github.com/alanthoms/raphael-frontend

Auth + sessions (and role-based authorization)
CRUD endpoints for ACPs / missions (whatever you support)
Search + filters (e.g., name/code/squadron)
Pagination + limit caps (e.g., max 100)
Input validation + sanitisation of query params
Consistent response shape ({ data, meta } style)


Node.js + Express
PostgreSQL
Drizzle ORM (type-safe SQL)
Auth (Better Auth or your solution)
