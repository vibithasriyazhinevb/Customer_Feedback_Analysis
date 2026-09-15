# Customer Feedback Analysis

A full-stack customer feedback application with a React client, an Express/MongoDB API, file attachments, and a Bruno collection for testing the API.

## Project structure

- `client/vite-project`: React and Vite frontend
- `server`: Express API and Mongoose models
- `bruno`: API requests for health, CRUD, and customer feedback queries

## Prerequisites

- Node.js 20 or newer
- MongoDB 7 or newer, either local or hosted
- Bruno, if you want to run the API collection

## Run locally

1. Configure the API environment:

	```powershell
	cd server
	Copy-Item .env.example .env
	```

	Set `MONGO_URI` in `server/.env`. `PORT` defaults to `5000`.

2. Start the API:

	```powershell
	cd server
	npm install
	npm start
	```

3. Start the frontend in a second terminal:

	```powershell
	cd client/vite-project
	npm install
	npm run dev
	```

	Set `VITE_API_URL` when the API is not running at `http://localhost:5000`.

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Check API availability |
| POST | `/api/feedback` | Create feedback, optionally with an image or PDF attachment |
| GET | `/api/feedback` | List feedback with customer details |
| GET | `/api/feedback/:id` | Read one feedback item |
| PUT | `/api/feedback/:id` | Update feedback |
| DELETE | `/api/feedback/:id` | Delete feedback |
| GET | `/api/customers/:customerId/feedback` | List feedback for one customer |

The POST endpoint accepts `customerName`, `email`, `rating`, `message`, and an optional `attachment` multipart field. Attachments are limited to 5 MB and must be an image or PDF.

## Bruno collection

Open the `bruno` folder in Bruno, select the `local` environment, and run `Health` first. Create feedback before running requests that need `feedbackId` or `customerId`; update those values in `bruno/environments/local.bru` using the IDs from the create response.

## Verify the client

```powershell
cd client/vite-project
npm run lint
npm run build
```

## Deployment

Deploy the `server` directory as a Node.js service, set `MONGO_URI` and `PORT` in the hosting provider's environment settings, and use `npm start` as the start command. Configure the frontend's `VITE_API_URL` to the deployed API URL before building the client.
