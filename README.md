# Customer Feedback Analysis

## Product experience

The responsive goodword workspace brings feedback collection and review into one place. Sign in or create an account, submit feedback with an optional image or PDF, review response and rating summaries with an interactive per-star breakdown, search and filter the conversation, edit or remove responses, and export the current results as CSV.

## Run the application

The website uses the API on `http://localhost:5000` by default. Start the backend first; it connects to MongoDB before accepting requests. If using a different API host or port, set `VITE_API_URL` in `client/vite-project/.env` and restart Vite.

## Deploy on Render

The root `Dockerfile` builds the React client and serves it from the Node API, so the deployed site and API share one origin. Create a free MongoDB Atlas database, then in Render choose **New → Blueprint** and connect this repository's `main` branch. Render reads `render.yaml` and creates the web service. Set the generated Atlas connection string as `MONGO_URI` when prompted; `JWT_SECRET` is generated automatically. After the first deploy, open the Render service URL to use the website.

Feedback attachments are stored in MongoDB so they remain available after a service restart. Google sign-in and AI autocomplete are optional and require their respective OAuth client ID and OpenAI API key to be configured in the hosting service. Set `GOOGLE_CLIENT_ID` in the hosting service to enable Google sign-in; the app reads it at runtime, so no client rebuild is needed. Never commit `.env` files or share secrets in chat.

## Authentication

The first screen is the Login/Register page. Create an account with a name, email, and password of at least six characters. After logging in, feedback requests use the saved JWT session. Use the Logout button in the header to end the session.

Set `MONGO_URI` in `server/.env` to a reachable MongoDB instance. For local development, the server creates and reuses a private random JWT key in the ignored `server/.dev-jwt-secret` file when `JWT_SECRET` is not set. For production, always set a strong, private `JWT_SECRET` in the server environment; do not commit secrets:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
```

The backend listens on port `5000` by default; set `PORT` in `server/.env` to override it.

For Google sign-in, create a Web OAuth client in Google Cloud Console. Add the same client ID as `VITE_GOOGLE_CLIENT_ID` in `client/vite-project/.env`, and add the exact frontend origin you open in your browser to the OAuth client's **Authorized JavaScript origins**. For example, the origin shown in the current local setup is `http://127.0.0.1:5174`; if you open `http://localhost:5173` instead, add that origin too. An origin includes the protocol, hostname, and port, but not a path or trailing slash.

If Google displays `Error 400: origin_mismatch`, open **Google Cloud Console → APIs & Services → Credentials → your Web OAuth client**, add the exact origin from the browser address bar under **Authorized JavaScript origins**, and save. Confirm that this OAuth client ID is the same one used for `VITE_GOOGLE_CLIENT_ID` in `client/vite-project/.env`. Then close the Google sign-in popup and try again.

If Google sign-in reports that the token or client ID does not match, make sure `GOOGLE_CLIENT_ID` in `server/.env` and `VITE_GOOGLE_CLIENT_ID` in `client/vite-project/.env` are the same active Web OAuth client ID. Restart both the backend and Vite after changing either value.

In one terminal:

```bash
npm run server
```

In a second terminal:

```bash
npm run client
```

Open the URL printed by Vite, register or log in, then submit the feedback form. The backend must have a working MongoDB connection configured in `server/.env`.

## Mock UX Design

Figma Link:
PASTE_YOUR_FIGMA_LINK_HERE

This Mock UX demonstrates the application's primary screens,
navigation flow, and major user journeys.
The design focuses on simple navigation and a clear user journey.
