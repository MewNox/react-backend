# Miyeon authentication backend

This Express API connects to a MySQL-compatible database. On startup it creates a `users` table if one does not already exist. Remote database connections automatically use verified TLS (TLS 1.2 or newer); local `localhost` connections do not require TLS.

## Setup

1. Make sure your database is available and its database/schema exists.
2. Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in `.env` or in your hosting provider's environment settings. The API also accepts `DB_DATABASE` and `DB_USERNAME` as aliases for the name and user.
3. Set `JWT_SECRET` to a random secret at least 32 characters long.
4. Run `npm install`, then `npm run dev`.

The API starts at `http://localhost:5000` locally. On Render, leave `PORT` to Render's automatic setting and set `FRONTEND_URL` to the deployed frontend's URL.

## Endpoints

- `POST /api/auth/signup` — create an account with `{ "name", "email", "password" }`
- `POST /api/auth/login` — sign in with `{ "email", "password" }`
- `GET /api/auth/me` — get the signed-in user using `Authorization: Bearer <token>`

Passwords are stored as bcrypt hashes. The database connection settings and JWT secret belong in the local `.env` file and should never be committed.
