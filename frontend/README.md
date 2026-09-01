# URAS Frontend

React and TypeScript frontend for the Unified Room Allocation System.

## Local Development

1. Copy `.env.example` to `.env` and set the backend URL.
2. Set `VITE_GOOGLE_CLIENT_ID` when Google sign-in is enabled on the backend.
3. Run `npm install`.
4. Run `npm run dev`.

The default frontend URL is `http://localhost:5173`. The backend must allow this origin and use the same Google client ID.

## Commands

- `npm run dev`: start the Vite development server.
- `npm run build`: type-check and build the production bundle.
- `npm run lint`: run ESLint.
- `npm run preview`: serve the production bundle locally.
