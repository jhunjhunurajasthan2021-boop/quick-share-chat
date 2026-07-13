# PrivLink — Secure Temporary File Sharing

## Overview
PrivLink is a privacy-first, temporary file-sharing and real-time chat web application. Files auto-expire after 2 hours. No accounts required.

## Features
- Anonymous file uploads with 2-hour auto-expiry
- Real-time chat per shared file (via Socket.io)
- Device pairing via 6-digit codes (peer-to-peer sessions)
- Activity logging (chat, upload, download) with IP and device capture
- Admin panel with monitoring, flagging, and CSV export
- Legal disclaimer: "User is responsible for uploaded content."

## Tech Stack
- **Frontend**: React + TypeScript + Vite + TailwindCSS + shadcn/ui + framer-motion
- **Backend**: Express.js + Socket.io + TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Routing**: wouter
- **Data Fetching**: TanStack Query v5

## Database Tables
- `files` — uploaded file metadata
- `messages` — chat messages per file room
- `activity_logs` — full activity audit trail (chat, upload, download)

## Admin Panel
- URL: `/admin`
- Default password: `privlink-admin-2024` (set `ADMIN_PASSWORD` env var to change)
- Features: view all logs, filter by type, search, flag suspicious activity, export CSV
- Suspicious files (`.exe`, `.bat`, `.sh`, `.apk`, etc.) are auto-flagged on upload

## Key Files
- `client/src/pages/Home.tsx` — Landing + upload page
- `client/src/pages/Share.tsx` — File share + chat page
- `client/src/pages/Admin.tsx` — Admin panel (login + dashboard)
- `client/src/components/PairingSystem.tsx` — Device pairing UI
- `client/src/components/UploadZone.tsx` — File upload component
- `server/routes.ts` — API routes + Socket.io logic
- `server/storage.ts` — Database operations
- `shared/schema.ts` — Drizzle schema + Zod types

## Running
Workflow: `Start application` → `npm run dev` (Express + Vite on port 5000)
