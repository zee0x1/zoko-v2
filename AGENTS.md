# Repository guide

## Project structure

This repository is a pnpm monorepo with two applications:

- `apps/client/`: Vite, React, TypeScript, and Tailwind CSS frontend.
- `apps/server/`: Express, TypeScript, TypeORM, class-validator, and PostgreSQL backend.
- `docker-compose.yml`: local PostgreSQL service used by the server.
- `pnpm-workspace.yaml`: declares the two pnpm workspace packages.

Keep client-only code inside `apps/client/` and server-only code inside `apps/server/`. Add a shared workspace package only when code is genuinely used by both applications.

## Root commands

- `pnpm run:client`: start the Vite development server.
- `pnpm run:server`: start Express through Nodemon.
- `pnpm build:client`: build the client.
- `pnpm build:server`: compile the server.
- `pnpm build`: build every workspace package.
- `pnpm typecheck`: type-check every workspace package.
- `docker compose up -d`: start PostgreSQL.
- `docker compose down`: stop PostgreSQL.

## Server startup

The server must establish its TypeORM/PostgreSQL connection before Express begins listening. A failed database connection must print a clear error and terminate with a non-zero exit code. Do not silently continue without the database.

## Testing policy

Do not use TDD in this repository. Do not create tests, test directories, test configuration, test scripts, or install testing dependencies unless the user explicitly changes this policy. Validate changes with the relevant build and type-check commands instead.

## Git policy

Do not create commits, amend commits, push branches, or open pull requests unless the user explicitly asks for that action.
