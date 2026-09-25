# Repository guide

## Project structure

This repository is a pnpm monorepo with two applications:

- `apps/client/`: Vite, React, TypeScript, and Tailwind CSS frontend.
- `apps/server/`: Express, TypeScript, TypeORM, class-validator, and PostgreSQL backend.
- `docker-compose.yml`: local PostgreSQL service used by the server.
- `apps/server/.env.example`: template for the server environment and local PostgreSQL settings.
- `apps/client/.env`: local client build-time environment variables when the client needs them.
- `pnpm-workspace.yaml`: declares the two pnpm workspace packages.

Keep client-only code inside `apps/client/` and server-only code inside `apps/server/`. Add a shared workspace package only when code is genuinely used by both applications.

## Root commands

- `pnpm run:client`: start the Vite development server.
- `pnpm run:server`: start Express through Nodemon.
- `pnpm build:client`: build the client.
- `pnpm build:server`: compile the server.
- `pnpm build`: build every workspace package.
- `pnpm typecheck`: type-check every workspace package.
- `pnpm db:up`: start PostgreSQL using `apps/server/.env`.
- `pnpm db:down`: stop PostgreSQL using `apps/server/.env`.

Each application owns its environment files. Copy the relevant `.env.example` to `.env` inside that application. Keep every `.env` local; only `.env.example` files belong in version control. Docker Compose receives the server environment file through the root database scripts.

## Server startup

The server must establish its TypeORM/PostgreSQL connection before Express begins listening. A failed database connection must print a clear error and terminate with a non-zero exit code. Do not silently continue without the database.

## Engineering approach

Always choose the simplest direct implementation that satisfies the current requirement. Do not overengineer.

- Think carefully before introducing an abstraction. Add one only when a current, concrete need justifies it, not for hypothetical future reuse.
- Do not add unnecessary layers, wrappers, helpers, generic utilities, configuration options, compatibility paths, or fallback behavior.
- Prefer straightforward local code over premature reuse or extensibility.
- Implement only what was requested. Do not add adjacent features or defensive machinery unless correctness requires it.
- When multiple valid approaches exist, use the one with the fewest moving parts and explain any unavoidable complexity.

## Testing policy

Do not use TDD in this repository. Do not create tests, test directories, test configuration, test scripts, or install testing dependencies unless the user explicitly changes this policy. Validate changes with the relevant build and type-check commands instead.

## Git policy

Do not create commits, amend commits, push branches, or open pull requests unless the user explicitly asks for that action.
