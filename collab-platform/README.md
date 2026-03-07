# 📝 CollabSync — Real-Time Collaborative Document Platform

> A full-stack real-time collaborative document editing platform built with **Node.js**, **Express**, **Socket.IO**, **MongoDB**, and **React (Vite)**. Multiple users can create, edit, share, and version-control documents simultaneously with live cursor tracking and presence indicators.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Folder Structure](#folder-structure)
4. [Process Architecture — Parent & Child Processes](#process-architecture)
5. [Async Tasks & When They Start](#async-tasks--when-they-start)
6. [Feature Deep Dives](#feature-deep-dives)
   - [Authentication Flow](#1-authentication-flow)
   - [Real-Time Collaboration (Socket.IO)](#2-real-time-collaboration-socketio)
   - [Document Management](#3-document-management)
   - [Version History System](#4-version-history-system)
   - [Sharing & Access Control](#5-sharing--access-control)
   - [Auto-Save Mechanism](#6-auto-save-mechanism)
   - [Cursor Tracking & Presence](#7-cursor-tracking--presence)
7. [File-by-File Breakdown](#file-by-file-breakdown)
   - [Server Files](#server-files)
   - [Client Files](#client-files)
8. [API Reference](#api-reference)
9. [Data Flow Diagrams](#data-flow-diagrams)
10. [Scalability & Maintainability](#scalability--maintainability)
11. [Monitoring Strategy](#monitoring-strategy)
12. [Possible Microservices Architecture](#possible-microservices-architecture)
13. [Getting Started](#getting-started)

---

## Project Overview

CollabSync is a real-time collaborative document editor (similar to a simplified Google Docs). The platform supports:

- **Multi-user real-time editing** — changes propagate instantly to all connected users via WebSockets
- **Live presence** — see who is editing with colored cursors and user avatars
- **Role-based access** — Owner, Editor, and Viewer permission levels
- **Version history** — every save creates a snapshot with attribution (who edited/renamed/restored)
- **Public sharing** — generate shareable links with cryptographically random tokens
- **Collaborator invites** — owners can invite users by email

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + Vite | SPA framework with fast HMR |
| Styling | Tailwind CSS | Utility-first CSS |
| State Management | React Context API | Auth state (global) |
| HTTP Client | Axios | REST API calls with interceptors |
| Real-Time | Socket.IO Client | WebSocket connection |
| Backend | Node.js + Express 5 | HTTP server + REST API |
| WebSocket | Socket.IO Server | Real-time bidirectional events |
| Database | MongoDB + Mongoose | Document storage |
| Auth | JWT (jsonwebtoken) | Stateless authentication |
| Password | bcryptjs | Password hashing |
| Crypto | Node.js `crypto` | Share token generation |
| Dev Tools | Nodemon | Auto-restart on file changes |

---

## Folder Structure

```
collab-platform/
│
├── package.json                  ← Root package (common dependencies: cors, express, mongoose, socket.io)
├── .env.example                  ← Environment variable template
│
├── server/                       ← Backend (Node.js + Express)
│   ├── server.js                 ← Entry point: creates HTTP server, mounts middleware/routes/socket
│   ├── .env                      ← Actual env vars (PORT, MONGODB_URI, JWT_SECRET, CLIENT_URL)
│   ├── package.json              ← Server-specific deps (bcryptjs, jsonwebtoken, etc.)
│   │
│   ├── config/
│   │   └── db.js                 ← MongoDB connection via Mongoose
│   │
│   ├── middleware/
│   │   └── authMiddleware.js     ← JWT verification middleware (protect guard)
│   │
│   ├── models/
│   │   ├── User.js               ← User schema (name, email, password + bcrypt hooks)
│   │   ├── Document.js           ← Document schema (title, content, owner, collaborators, shareToken)
│   │   └── Version.js            ← Version snapshot schema (document ref, content, attribution, action)
│   │
│   ├── controllers/
│   │   ├── authController.js     ← Register/Login handlers, JWT generation
│   │   └── documentController.js ← All document CRUD, sharing, invite, versioning logic
│   │
│   ├── routes/
│   │   ├── authRoutes.js         ← POST /api/auth/register, POST /api/auth/login
│   │   ├── documentRoutes.js     ← Full document REST API with optional/required auth
│   │   └── health.js             ← GET /api/health — server health check endpoint
│   │
│   └── socket/
│       └── socket.js             ← Socket.IO server: rooms, real-time sync, presence, auto-save
│
└── client/                       ← Frontend (React + Vite)
    ├── index.html                ← Vite HTML entry point
    ├── vite.config.js            ← Vite build config
    ├── tailwind.config.js        ← Tailwind custom theme (primary colors, custom animations)
    ├── postcss.config.js         ← PostCSS for Tailwind processing
    ├── package.json              ← Client deps (react, react-router-dom, axios, socket.io-client, lucide-react)
    │
    └── src/
        ├── main.jsx              ← React DOM root, mounts <App />
        ├── App.jsx               ← Router setup + AuthProvider wrapping all routes
        ├── index.css             ← Global styles, glass morphism utility classes
        │
        ├── context/
        │   └── AuthContext.jsx   ← Global auth state: user, token, login(), logout()
        │
        ├── hooks/
        │   └── useSocket.js      ← Custom hook: creates + returns Socket.IO connection
        │
        ├── services/
        │   └── api.js            ← Axios instance with base URL + JWT interceptors
        │
        ├── pages/
        │   ├── LandingPage.jsx   ← Public marketing/hero page
        │   ├── Login.jsx         ← Login form page
        │   ├── Register.jsx      ← Registration form page
        │   ├── Dashboard.jsx     ← Authenticated user's document list (CRUD + search)
        │   └── DocumentPage.jsx  ← Core editor: real-time editing, presence, versioning
        │
        └── components/
            ├── ProtectedRoute.jsx      ← Route guard: redirects unauthenticated users
            ├── DocumentCard.jsx         ← Individual document card on dashboard
            ├── ShareModal.jsx           ← Modal: public link generation + collaborator invite
            └── VersionHistoryPanel.jsx  ← Side panel: browsable version snapshots + restore
```

---

## Process Architecture

### 🧩 Parent Process — Node.js HTTP Server (`server.js`)

The **parent process** is the main Node.js process started via `node server.js` (or `nodemon server.js` in dev). It:

1. Loads environment variables (`dotenv`)
2. Creates an **Express app** instance
3. Wraps it in a **Node.js `http.Server`** — this is critical because Socket.IO needs access to the raw HTTP server, not just Express
4. Calls `connectDB()` — async MongoDB connection (fire-and-forget at startup)
5. Registers Express middleware (`cors`, `express.json`)
6. Calls `initSocket(server)` — attaches Socket.IO to the HTTP server
7. Mounts REST route handlers
8. Starts listening on `PORT`

```
Node.js Process (server.js)
│
├── http.createServer(expressApp)   ← Creates raw HTTP server
│    └── Shared with Socket.IO
│
├── connectDB()                     ← Async: connects MongoDB
├── initSocket(server)              ← Attaches Socket.IO
│    └── io.on('connection', ...)   ← Event-driven, non-blocking
│
└── server.listen(PORT)             ← Starts accepting connections
```

### 🌐 Client Process — React App (Browser)

The **client process** runs in the user's browser (or during dev, a Vite dev server process):

- `main.jsx` renders the React tree inside `<React.StrictMode>`
- `<AuthProvider>` wraps everything — initializes auth state from `localStorage`
- `<BrowserRouter>`  manages client-side routing
- `useSocket()` hook starts a **Socket.IO WebSocket connection** as a side effect when `DocumentPage` mounts

### 🔀 How They Communicate

```
Browser (Client)                    Node.js (Server)
     │                                     │
     │  HTTP REST (Axios)                  │
     │ ──────────────────────────────────► │ Express routes → Controllers → MongoDB
     │ ◄────────────────────────────────── │ JSON Response
     │                                     │
     │  WebSocket (Socket.IO)              │
     │ ◄──────────────────────────────────►│ socket.on() / socket.emit()
     │  Persistent bidirectional channel   │ Room-based broadcasting
```

---

## Async Tasks & When They Start

The application has multiple asynchronous flows. Here is exactly when each one starts and what it does:

### Server-Side Async Tasks

| Task | Triggered When | What It Does |
|------|---------------|-------------|
| `connectDB()` | `server.js` starts (immediately) | Opens Mongoose connection pool to MongoDB Atlas/local |
| `registerUser` | `POST /api/auth/register` received | `await User.findOne()` check → `await User.create()` with bcrypt pre-save hook |
| `loginUser` | `POST /api/auth/login` received | `await User.findOne()` → `await user.matchPassword()` (bcrypt compare) |
| `createDocument` | `POST /api/documents` | Creates Document record + calls `createVersion()` for initial snapshot |
| `getAllDocuments` | `GET /api/documents` | Queries owner/collaborator filtered docs, `.populate('owner')` |
| `getDocumentById` | `GET /api/documents/:id` | Fetches doc with populated owner + collaborators, checks share token |
| `updateDocumentTitle` | `PUT /api/documents/:id` | Saves new title + creates `rename` version snapshot |
| `deleteDocument` | `DELETE /api/documents/:id` | Deletes document + `Version.deleteMany()` (cascading delete) |
| `enablePublicShare` | `POST /api/documents/:id/share` | Generates `crypto.randomBytes(16)` token, sets `isPublic: true` |
| `inviteCollaborator` | `POST /api/documents/:id/invite` | Looks up user by email, pushes to `collaborators[]` |
| `getDocumentVersions` | `GET /api/documents/:id/versions` | Finds all versions sorted by `createdAt: -1`, builds preview snippets |
| `restoreVersion` | `POST /api/documents/:id/restore/:versionId` | Creates `restore` version entry, overwrites document content |
| `socket: save-document` | Socket event every 20 seconds from client | Async: finds doc, calls `createVersion()`, saves `doc.content` |

### Client-Side Async Tasks (React)

| Task | Triggered When | `useEffect` Dependency |
|------|----------------|----------------------|
| `AuthContext` init | App mounts | Reads `localStorage` for token + user |
| `fetchDocuments()` | `Dashboard` mounts | `[]` — runs once |
| `fetchDocument()` | `DocumentPage` mounts | `[id, user, navigate, shareToken]` |
| Socket `join-document` emit | Socket + document id ready | `[socket, id, user, myColor]` |
| Auto-save interval | Socket + id ready + user is not viewer | `[socket, id, permission, user]` — `setInterval` every 20s |
| `fetchVersions()` | `VersionHistoryPanel` opens | `[isOpen, documentId]` |
| Typing timeout cleanup | User stops typing | `typingTimeoutRef` — 2 second debounce |

---

## Feature Deep Dives

### 1. Authentication Flow

**Files involved:** `authController.js`, `authMiddleware.js`, `User.js`, `AuthContext.jsx`, `api.js`, `Login.jsx`, `Register.jsx`

#### Registration
```
User fills form → Register.jsx
  → api.post('/auth/register', { name, email, password })
  → authController.registerUser()
    → User.findOne({ email })          ← Check duplicate
    → User.create({ name, email, password })
      → bcrypt pre-save hook (auto-hashes password with salt=10)
    → generateToken(user._id)          ← Signs JWT (30d expiry)
  → Returns { _id, name, email, token }
  → AuthContext.login(data)
    → Stores token + user in localStorage
    → Sets React state (user, token)
  → Navigate to /dashboard
```

#### Login
```
User fills form → Login.jsx
  → api.post('/auth/login', { email, password })
  → authController.loginUser()
    → User.findOne({ email })
    → user.matchPassword(password)     ← bcrypt.compare()
    → generateToken(user._id)
  → Returns { _id, name, email, token }
  → AuthContext.login(data) → localStorage + state
  → Navigate to /dashboard
```

#### Protected Routes
```
Every API call → api.js interceptor
  → Reads token from localStorage
  → Adds Authorization: Bearer <token> header

Every protected endpoint → authMiddleware.protect()
  → jwt.verify(token, JWT_SECRET)
  → Attaches decoded payload to req.user
  → Calls next() or returns 401

ProtectedRoute.jsx (client)
  → Reads from AuthContext
  → If no user/token → <Navigate to="/login" />
  → If loading → shows spinner
```

**New Concepts Used:**
- `bcryptjs` `pre('save')` Mongoose hook — auto-hashes password before every `save()`
- `jwt.sign()` with `expiresIn: '30d'` — creates stateless session token
- Axios request interceptors for automatic token injection
- Axios response interceptors for global 401 handling + auto-redirect

---

### 2. Real-Time Collaboration (Socket.IO)

**Files involved:** `socket/socket.js`, `useSocket.js`, `DocumentPage.jsx`

#### Connection Lifecycle
```
DocumentPage mounts
  → useSocket() hook: io(socketUrl) creates WebSocket connection
  → Server: io.on('connection', socket => {...})
  → socket.id assigned (unique per connection)

User opens document
  → socket.emit('join-document', { documentId, username, color })
  → Server: socket.join(documentId)   ← User added to Socket.IO "Room"
  → Server: activeUsers[documentId].push({ socketId, username, color })
  → Server: io.to(documentId).emit('users-update', activeUsers[documentId])
  → All clients in room receive updated user list

DocumentPage unmounts / tab closed
  → socket.disconnect() (useSocket cleanup)
  → Server: socket.on('disconnect')
    → Removes user from all activeUsers rooms
    → Broadcasts 'users-update' to remaining users
    → Cleans up empty rooms (delete activeUsers[documentId])
```

#### Real-Time Edit Propagation
```
User types in textarea
  → handleTextChange(e)
    → setContent(newContent)           ← Local state update (instant)
    → contentRef.current = newContent  ← Ref update (no re-render)
    → socket.emit('send-changes', { documentId, content: newContent })

Server receives event
  → socket.to(documentId).emit('receive-changes', content)
  → Does NOT send back to sender (socket.to vs io.to)

Other clients receive
  → socket.on('receive-changes', newContent)
    → setContent(newContent)
    → contentRef.current = newContent
```

**In-Memory Active Users Store:**
```js
// Structure in socket.js:
const activeUsers = {
  "docId123": [
    { socketId: "abc", username: "Alice", color: "#f43f5e" },
    { socketId: "def", username: "Bob",   color: "#3b82f6" }
  ]
}
```
This is **ephemeral** — resets if server restarts. It holds presence data only.

**Socket.IO Events Map:**

| Event (Client → Server) | Event (Server → Client) | Purpose |
|--------------------------|--------------------------|---------|
| `join-document` | `users-update`, `document-joined` | Room entry + presence broadcast |
| `send-changes` | `receive-changes` | Real-time content sync |
| `cursor-move` | `cursor-update` | Live cursor positions |
| `typing` | `user-typing` | Typing indicator |
| `stop-typing` | `user-stop-typing` | Stop typing indicator |
| `save-document` | _(none, async DB write)_ | Triggered auto-save + version snapshot |

---

### 3. Document Management

**Files involved:** `documentController.js`, `documentRoutes.js`, `Document.js`, `Dashboard.jsx`, `DocumentCard.jsx`

#### Create Document Flow
```
Dashboard.jsx → handleCreateDocument()
  → api.post('/documents')
  → documentController.createDocument()
    → Document.create({ title: 'Untitled Document', owner: req.user.id })
    → createVersion(document._id, "", userId, userName, 'edit')   ← Initial snapshot
  → Returns new document
  → navigate(`/document/${data._id}`)   ← Redirect to editor
```

#### Fetch All Documents
```
Dashboard mounts → fetchDocuments()
  → api.get('/documents')
  → documentController.getAllDocuments()
    → Document.find({ $or: [{ owner }, { collaborators }] })
    → .sort({ updatedAt: -1 })
    → .populate('owner', 'name email')
  → Returns documents array sorted by newest
```

#### Permission System (getDocumentById)
```
User opens /document/:id
  → Fetch with optional shareToken query param
  → documentController.getDocumentById()
    → Check: isOwner = owner._id === req.user.id
    → Check: isCollaborator = collaborators.includes(req.user.id)
    → Check: isPublic && token === document.shareToken
    → If none match → 403 Forbidden
  → Client sets permission: 'owner' | 'editor' | 'viewer'
  → 'viewer' → textarea is disabled (read-only)
```

**New Concepts Used:**
- MongoDB `$or` operator for ownership + collaboration query
- `.populate()` to replace ObjectId references with actual user documents
- `sparse: true` on `shareToken` field — allows multiple null values but enforces uniqueness on non-null values

---

### 4. Version History System

**Files involved:** `documentController.js`, `Version.js`, `VersionHistoryPanel.jsx`

#### How Versions Are Created
```
Version created by 3 different triggers:

1. REST save: updateDocumentContent (PUT /api/documents/:id)
   → createVersion(id, content, userId, userName, 'edit')
   → Document.save()

2. Socket auto-save: 'save-document' event (every 20 seconds)
   → createVersion(id, content, userId, userName, 'edit')
   → Document.save()

3. Title rename: updateDocumentTitle (PUT /api/documents/:id)
   → createVersion(id, content, userId, userName, 'rename')

4. Restore: restoreVersion (POST /api/documents/:id/restore/:versionId)
   → createVersion(id, version.content, userId, userName, 'restore')
   → document.content = version.content
   → Document.save()
```

#### Deduplication Logic
```js
// Inside createVersion():
const lastVersion = await Version.findOne({ document: documentId }).sort({ createdAt: -1 });
const lastContent = lastVersion ? JSON.stringify(lastVersion.content) : null;
const newContent = JSON.stringify(content);
if (lastContent === newContent && action === 'edit') {
    return null; // Skip — content hasn't changed
}
```

#### Version Schema — Fields Explained
| Field | Type | Purpose |
|-------|------|---------|
| `document` | ObjectId → Document | Which document this version belongs to |
| `content` | Object | Snapshot of the full content at this point |
| `createdBy` | ObjectId → User | User ID of who triggered this version |
| `createdByName` | String | Denormalized name (stored directly for display without join) |
| `action` | Enum: `edit\|restore\|rename` | What kind of change this snapshot represents |
| `createdAt` | Date | Manual timestamp for chronological ordering |

#### Restore Flow
```
User opens VersionHistoryPanel
  → api.get('/documents/:id/versions')
  → Returns versions with preview (first 120 chars of content)
  → User selects a version → clicks "Restore This Version"
  → api.post('/documents/:id/restore/:versionId')
  → Server: STRICT owner-only check
  → Creates NEW 'restore' version entry (audit trail)
  → document.content = selectedVersion.content
  → doc.save()
  → Client: onRestore(data.content) updates editor state
  → socket.emit('send-changes') broadcasts restored content to all collaborators
```

**New Concepts Used:**
- Denormalized `createdByName` — avoids extra User lookup when listing versions
- `JSON.stringify()` comparison for content deduplication
- `{ timestamps: false }` on Version schema — uses manual `createdAt` field for explicit control

---

### 5. Sharing & Access Control

**Files involved:** `documentController.js`, `Document.js`, `ShareModal.jsx`, `documentRoutes.js`

#### Public Link Generation
```
Owner opens ShareModal → togglePublicShare()
  → api.post('/documents/:id/share')
  → documentController.enablePublicShare()
    → if (!document.shareToken):
        document.shareToken = crypto.randomBytes(16).toString('hex')
        // Generates 32-char hex string e.g. "a3f9bc12..."
    → document.isPublic = true
    → document.save()
  → Returns { isPublic: true, shareToken }
  → ShareModal renders: /document/:id?share=<token>
```

#### Public Access Validation
```
Anonymous user opens shared link /document/:id?share=abc123
  → DocumentPage extracts shareToken from URL params (useSearchParams)
  → api.get('/documents/:id?share=abc123')
  → documentRoutes: optionalProtect middleware
    → If Bearer token present → verify + attach req.user
    → If not → just call next() (req.user = undefined)
  → documentController.getDocumentById()
    → document found, user not authenticated
    → isPublic=true && token === document.shareToken → isAuthorized = true
  → permission set to 'editor' (can view + edit via public link)
```

#### Private Collaborator Invite
```
Owner enters email → handleInvite()
  → api.post('/documents/:id/invite', { email })
  → documentController.inviteCollaborator()
    → Find user by email
    → Guard: cannot invite self
    → Guard: check not already collaborator
    → document.collaborators.push(user._id)
    → document.populate('collaborators', 'name email')
  → Returns updated collaborators list
  → ShareModal rerenders with new collaborator
```

---

### 6. Auto-Save Mechanism

**Files involved:** `DocumentPage.jsx` (client), `socket/socket.js` (server)

```
DocumentPage mounts with edit permission
  → useEffect with [socket, id, permission, user]
    → setInterval every 20,000ms (20 seconds)
      → setSaving(true)
      → socket.emit('save-document', {
            documentId: id,
            content: contentRef.current,   ← Uses ref to avoid stale closure
            userId: user?._id,
            userName: user?.name
          })
      → setTimeout(() => setSaving(false), 800)  ← UI feedback
  → Cleanup: clearInterval on unmount
```

**Why `contentRef` instead of `content` state?**
The interval callback is created once and captures the initial `content` value (stale closure problem). The `contentRef` is a mutable ref updated on every keystroke (`contentRef.current = newContent`), so the interval always reads the **latest** content without needing to recreate the interval.

```
Server receives 'save-document'
  → async handler (due to DB operations)
  → Document.findById(documentId)
  → createVersion(...)    ← May skip if content unchanged
  → doc.content = content
  → doc.save()
```

---

### 7. Cursor Tracking & Presence

**Files involved:** `DocumentPage.jsx`, `socket/socket.js`

#### Cursor Position Broadcasting
```
User moves mouse over editor area
  → handleMouseMove(e)
    → Get bounding rect of editor container
    → Calculate relative position as percentage:
        x = ((clientX - rect.left) / rect.width) * 100
        y = ((clientY - rect.top) / rect.height) * 100
    → socket.emit('cursor-move', { documentId, x, y })

Server:
  → socket.to(documentId).emit('cursor-update', { socketId, x, y })

Other clients:
  → setCursors(prev => ({ ...prev, [socketId]: { x, y } }))
  → Renders <div> absolutely positioned at {left: `${pos.x}%`, top: `${pos.y}%`}
  → Shows colored MousePointer2 icon + username label
```

#### Typing Indicator (Debounced)
```
User types
  → socket.emit('typing', { documentId, username })
  → clearTimeout(typingTimeoutRef.current)
  → typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop-typing', { documentId })
      }, 2000)    ← 2s after last keystroke

Other clients:
  → 'user-typing': setTypingUser(username)    → Shows "Alice is typing..."
  → 'user-stop-typing': setTypingUser(null)  → Hides indicator
```

**New Concepts Used:**
- Percentage-based cursor positions — viewport-independent, works on any screen size
- `useRef` for timeout ID to properly clear debounce timers across re-renders
- Socket.IO rooms (`socket.join(documentId)`) for namespaced broadcasting

---

## File-by-File Breakdown

### Server Files

#### `server/server.js`
- **What it contains:** Application bootstrap/entry point
- **Key pattern:** `http.createServer(app)` — HTTP server wraps Express so Socket.IO can share the same port
- **New concepts:** Express 5 (async error handling improved), shared HTTP server between REST and WebSocket

#### `server/config/db.js`
- **What it contains:** Mongoose connection configuration
- **Key pattern:** `process.exit(1)` on connection failure — prevents server from running without DB
- **New concepts:** Async/await with Mongoose; connection string from environment variables

#### `server/middleware/authMiddleware.js`
- **What it contains:** `protect` middleware function that verifies JWT tokens
- **Key pattern:** Attaches `req.user = decoded` so downstream handlers know who is calling
- **New concepts:** JWT `verify()` with secret; Bearer token extraction from `Authorization` header

#### `server/models/User.js`
- **What it contains:** Mongoose schema for users; bcrypt pre-save hook; `matchPassword` instance method
- **Key pattern:** `pre('save')` hook — runs automatically before every `save()` call
- **New concepts:** Mongoose middleware hooks; `isModified('password')` check to avoid double-hashing on re-save; `bcrypt.genSalt(10)` + `bcrypt.hash()`

#### `server/models/Document.js`
- **What it contains:** Document schema with content (flexible Object type), owner ref, collaborators array, sharing fields
- **Key pattern:** `shareToken` with `sparse: true` — unique index that allows multiple `null` values
- **New concepts:** `mongoose.Schema.Types.ObjectId` with `ref` for population; `{ timestamps: true }` adds `createdAt`/`updatedAt` automatically

#### `server/models/Version.js`
- **What it contains:** Version snapshot schema with action enum, content object, and attribution fields
- **Key pattern:** `createdByName` string stored directly (denormalized) for fast retrieval
- **New concepts:** `enum` validator on String fields; `{ timestamps: false }` with manual `createdAt` for explicit control

#### `server/controllers/authController.js`
- **What it contains:** `registerUser` and `loginUser` async handlers; `generateToken` helper
- **Key pattern:** Standard async try/catch REST handlers returning JSON
- **New concepts:** `jwt.sign({ id }, secret, { expiresIn: '30d' })` — payload, secret, options pattern

#### `server/controllers/documentController.js`
- **What it contains:** All document business logic — CRUD, sharing, invite, versioning, restore
- **Key pattern:** `createVersion` helper is reused across multiple controllers (edit, rename, restore)
- **New concepts:** `crypto.randomBytes(16).toString('hex')` for secure token generation; `$or` MongoDB query; `populate()` with field selection; `deleteMany()` for cascading delete; JSON.stringify for deep equality check

#### `server/routes/documentRoutes.js`
- **What it contains:** Express router with `optionalProtect` middleware for public document access
- **Key pattern:** `optionalProtect` checks if auth header is present before deciding to verify
- **New concepts:** Conditional middleware application; route-level middleware ordering matters

#### `server/socket/socket.js`
- **What it contains:** Socket.IO server initialization; all real-time event handlers; in-memory `activeUsers` store
- **Key pattern:** `socket.to(room)` excludes sender; `io.to(room)` includes everyone
- **New concepts:** Socket.IO rooms for namespaced broadcasting; `require()` inside event handler to avoid circular dependency; async socket event handlers for DB operations; in-memory map cleaned up on disconnect

---

### Client Files

#### `client/src/main.jsx`
- **What it contains:** React 18 `createRoot` entry point; mounts `<App />`
- **New concepts:** React 18 `createRoot` API (vs older `ReactDOM.render`)

#### `client/src/App.jsx`
- **What it contains:** Router setup; all route definitions; `AuthProvider` wrapper
- **Key pattern:** `<ProtectedRoute>` wraps authenticated routes as a layout route
- **New concepts:** React Router v6 nested routes; layout routes via `<Outlet>`

#### `client/src/context/AuthContext.jsx`
- **What it contains:** Global auth state; `login()` and `logout()` functions; localStorage persistence
- **Key pattern:** Validates stored user data has `_id` field before restoring (handles legacy data)
- **New concepts:** React Context API with `createContext` + `useContext`; localStorage as session store; conditional render `{!loading && children}` prevents flash of unauthenticated content

#### `client/src/hooks/useSocket.js`
- **What it contains:** Custom hook that creates and manages a Socket.IO client connection
- **Key pattern:** Cleanup function `newSocket.close()` runs on component unmount — prevents memory leaks
- **New concepts:** Custom React hooks; `io()` from `socket.io-client`; `import.meta.env.VITE_*` Vite environment variables

#### `client/src/services/api.js`
- **What it contains:** Configured Axios instance with base URL + request/response interceptors
- **Key pattern:** Request interceptor auto-injects JWT; response interceptor handles global 401
- **New concepts:** Axios interceptors for cross-cutting concerns; `import.meta.env` for env vars in Vite

#### `client/src/pages/LandingPage.jsx`
- **What it contains:** Public-facing marketing page with hero section, feature list
- **New concepts:** Tailwind glassmorphism utilities; gradient text

#### `client/src/pages/Login.jsx` / `Register.jsx`
- **What it contains:** Form pages that call auth API and store result in AuthContext
- **Key pattern:** On success call `AuthContext.login(data)` then `navigate('/dashboard')`

#### `client/src/pages/Dashboard.jsx`
- **What it contains:** Authenticated document list with stats bar, search, create/delete
- **Key pattern:** `handleDeleteDocument` only updates local state (no re-fetch) for optimistic UI
- **New concepts:** Client-side filtering with `Array.filter`; Lucide React icon library

#### `client/src/pages/DocumentPage.jsx`
- **What it contains:** Core editor page — the most complex file; handles socket events, permissions, auto-save, cursors, typing indicators, modals
- **Key pattern:** Three separate `useEffect`s with different dependency arrays control fetch, socket, and auto-save independently
- **New concepts:** `useSearchParams` for reading URL query params; `useRef` for non-reactive mutable values; `useCallback` pattern for stable function references; percentage-based absolute positioning for cursors; permission-level state machine (`owner` → `editor` → `viewer`)

#### `client/src/components/ProtectedRoute.jsx`
- **What it contains:** Route guard that checks auth before rendering children
- **Key pattern:** Renders loading state while auth is resolving (prevents flash redirect)

#### `client/src/components/DocumentCard.jsx`
- **What it contains:** Card UI for each document on dashboard with rename/delete/open actions
- **New concepts:** Inline editing (input field replaces title on click); optimistic state update pattern

#### `client/src/components/ShareModal.jsx`
- **What it contains:** Modal for toggling public access, copying share link, inviting collaborators by email
- **Key pattern:** `onUpdate` callback prop updates parent (DocumentPage) state without re-fetch
- **New concepts:** `navigator.clipboard.writeText()` for copy-to-clipboard; toggle switch with Tailwind `peer` variant

#### `client/src/components/VersionHistoryPanel.jsx`
- **What it contains:** Slide-in panel showing version timeline; selection + restore UI; owner-gated restore button
- **Key pattern:** `ACTION_META` object maps action type to icon/color/label — avoids conditional chains
- **New concepts:** `line-clamp-2` Tailwind for multi-line text ellipsis; relative time formatting with diff calculations; animate-slide-in-right CSS animation

---

## API Reference

### Auth Endpoints

| Method | Endpoint | Auth | Body | Returns |
|--------|----------|------|------|---------|
| POST | `/api/auth/register` | None | `{ name, email, password }` | `{ _id, name, email, token }` |
| POST | `/api/auth/login` | None | `{ email, password }` | `{ _id, name, email, token }` |

### Document Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/documents` | Required | Create new document |
| GET | `/api/documents` | Required | Get all user's documents |
| GET | `/api/documents/:id` | Optional* | Get document by ID |
| PUT | `/api/documents/:id` | Required | Rename document |
| DELETE | `/api/documents/:id` | Required | Delete document + versions |
| POST | `/api/documents/:id/share` | Required (Owner) | Enable public sharing |
| POST | `/api/documents/:id/unshare` | Required (Owner) | Disable public sharing |
| POST | `/api/documents/:id/invite` | Required (Owner) | Invite collaborator by email |
| GET | `/api/documents/:id/versions` | Required | List version history |
| POST | `/api/documents/:id/restore/:versionId` | Required (Owner) | Restore version |

*`GET /documents/:id` allows anonymous access if document is public and `?share=<token>` is provided

### Health Endpoint

| Method | Endpoint | Auth | Returns |
|--------|----------|------|---------|
| GET | `/api/health` | None | `{ status: 'ok' }` |

### Socket.IO Events

| Direction | Event | Payload | Description |
|-----------|-------|---------|-------------|
| Client → Server | `join-document` | `{ documentId, username, color }` | Enter document room |
| Client → Server | `send-changes` | `{ documentId, content }` | Broadcast edit |
| Client → Server | `cursor-move` | `{ documentId, x, y }` | Broadcast cursor position |
| Client → Server | `typing` | `{ documentId, username }` | Signal typing started |
| Client → Server | `stop-typing` | `{ documentId }` | Signal typing stopped |
| Client → Server | `save-document` | `{ documentId, content, userId, userName }` | Trigger DB save + version |
| Server → Client | `users-update` | `[{ socketId, username, color }]` | Updated presence list |
| Server → Client | `receive-changes` | `content` | New content from a peer |
| Server → Client | `cursor-update` | `{ socketId, x, y }` | Peer cursor position |
| Server → Client | `user-typing` | `username` | Peer is typing |
| Server → Client | `user-stop-typing` | _(none)_ | Peer stopped typing |
| Server → Client | `document-joined` | `documentId` | Confirmation of room join |

---

## Data Flow Diagrams

### Full Edit Flow
```
[User types in textarea]
        │
        ▼
[handleTextChange(e)]
  ├─► setContent(new)        — React state update (re-render)
  ├─► contentRef.current     — Mutable ref update (no re-render)
  ├─► socket.emit('send-changes') ─────────────────────────────────►
  └─► socket.emit('typing')                                          │
                                                              [socket.js server]
                                                              socket.to(room).emit('receive-changes')
                                                                      │
                                                         ◄────────────┘
                                                  [Other connected clients]
                                                  socket.on('receive-changes', content)
                                                    → setContent(content)
```

### Auto-Save + Version Creation Flow
```
[Every 20 seconds — client interval]
  └─► socket.emit('save-document', { documentId, content, userId, userName })
                │
                ▼ [socket.js server — async handler]
          Document.findById(documentId)
                │
                ▼
          createVersion(id, content, userId, userName, 'edit')
            ├─ Find last version
            ├─ Compare content (JSON.stringify)
            ├─ If same → return null (skip)
            └─ If different → Version.create({...})
                │
                ▼
          doc.content = content
          doc.save()
```

### Restore Flow
```
[Owner clicks "Restore This Version"]
  └─► api.post('/documents/:id/restore/:versionId')
              │
              ▼ [documentController.restoreVersion]
        Check: owner only
              │
              ▼
        Version.findById(versionId)
              │
              ▼
        createVersion(id, version.content, userId, userName, 'restore')
              │  ← Creates audit trail entry BEFORE restore
              ▼
        document.content = version.content
        document.save()
              │
              ▼ [client receives response]
        onRestore(data.content)
          ├─ setContent(restoredContent)
          ├─ contentRef.current = restoredContent
          └─ socket.emit('send-changes', { content: restoredContent })
                  └─► Broadcasts restored state to all collaborators in room
```

---

## Scalability & Maintainability

### Current Limitations

| Concern | Current Implementation | Impact |
|---------|----------------------|--------|
| **In-memory presence store** | `activeUsers` map in `socket.js` | Lost on server restart; won't work with >1 server instance |
| **Single server process** | Node.js single instance | CPU-bound tasks block the event loop; no fault tolerance |
| **No message queue** | Save events processed inline | High traffic could overwhelm DB with write operations |
| **No rate limiting** | All endpoints unthrottled | Vulnerable to abuse / DDoS |
| **No input validation** | Basic checks only | Malformed data could cause errors |
| **No pagination** | `getAllDocuments` returns all | Will slow down as document count grows |
| **No content diffing** | Sends full content on every change | Bandwidth scales with document size |
| **Client-side search** | `Array.filter` in browser | Inefficient for large document sets |

### Recommended Improvements

#### Short-Term (Maintainability)
- Add **Joi or Zod** for request body validation on all endpoints
- Add **pagination** (`?page=1&limit=20`) to `getAllDocuments`
- Add **rate limiting** with `express-rate-limit` on auth endpoints
- Move `activeUsers` to **Redis** for multi-instance compatibility
- Add **Winston** logger replacing `console.log/error`
- Add **Helmet.js** for HTTP security headers
- Write **unit tests** for controllers with Jest + Supertest

#### Medium-Term (Scalability)
- Use **Operational Transforms (OT)** or **CRDTs** (like Y.js) instead of last-write-wins for conflict-free concurrent editing
- Use **Redis Pub/Sub** with Socket.IO adapter (`socket.io-redis`) to support horizontal scaling
- Implement **content diffing** (send only changed portions, not full content)
- Add **MongoDB indexes** on `Document.owner`, `Document.collaborators`, `Version.document + createdAt`
- Use **MongoDB TTL indexes** on Version collection to auto-expire old versions

---

## Monitoring Strategy

### Application Metrics to Track

#### Server Health
- **HTTP response times** per endpoint (p50, p95, p99)
- **Error rates** (4xx, 5xx) per endpoint
- **Active WebSocket connections** count
- **Socket.IO room counts** (active documents)
- **Memory usage** (watch for activeUsers map growth)

#### Business Metrics
- **Documents created per hour**
- **Active editing sessions** (rooms with >1 user)
- **Version snapshots per day**
- **Public links accessed** vs private

#### Database Metrics
- **MongoDB connection pool usage**
- **Query execution times** (slow query log)
- **Collection sizes** (especially `versions` collection)
- **Index hit rates**

### Recommended Monitoring Stack

```
Application Logs → Winston → Log Aggregator (Datadog / ELK Stack)
                                    │
Metrics Endpoint (/api/health) → Prometheus Scrape → Grafana Dashboard
                                    │
Socket.IO Events → Custom event emitters → Metrics store
                                    │
MongoDB → MongoDB Atlas Monitoring or Ops Manager
```

### Health Check Endpoint
The existing `/api/health` endpoint should be extended:
```js
// Recommended enhancement:
router.get('/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    memory: process.memoryUsage(),
  });
});
```

---

## Possible Microservices Architecture

The current monolith can be decomposed into the following services as traffic grows:

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                               │
│              (rate limiting, auth routing, load balancing)       │
└─────┬──────────┬──────────┬──────────┬─────────────────────────┘
      │          │          │          │
      ▼          ▼          ▼          ▼
┌─────────┐ ┌────────┐ ┌────────┐ ┌──────────────┐
│  Auth   │ │  Doc   │ │Version │ │  Presence &  │
│ Service │ │Service │ │Service │ │ Collab (WS)  │
│         │ │        │ │        │ │              │
│POST /auth│ │CRUD    │ │CREATE  │ │Socket.IO     │
│/register │ │/docs   │ │LIST    │ │Rooms         │
│/login   │ │        │ │RESTORE │ │Cursors       │
└────┬────┘ └───┬────┘ └───┬────┘ └──────┬───────┘
     │          │          │             │
     ▼          ▼          ▼             ▼
┌─────────┐ ┌────────┐ ┌────────┐ ┌──────────┐
│  Users  │ │  Docs  │ │Versions│ │  Redis   │
│  DB     │ │   DB   │ │   DB   │ │(Presence)│
│(MongoDB)│ │(MongoDB│ │(MongoDB│ │+ Pub/Sub │
└─────────┘ └────────┘ └────────┘ └──────────┘
```

### Service Responsibilities

| Service | Responsibility | Technology |
|---------|---------------|------------|
| **API Gateway** | Auth verification, routing, rate limiting | Kong / nginx / Express |
| **Auth Service** | Register, login, token generation, user management | Node.js + MongoDB (Users) |
| **Document Service** | CRUD, sharing, collaborator management | Node.js + MongoDB (Documents) |
| **Version Service** | Snapshot creation, version listing, restore | Node.js + MongoDB (Versions) |
| **Collaboration Service** | WebSocket connections, real-time sync, cursor tracking | Node.js + Socket.IO + Redis |
| **Notification Service** | Email invites, in-app notifications | Node.js + SendGrid/SES |

### Communication Patterns
- **Auth → Other services:** JWT validation (stateless — no inter-service call needed)
- **Collaboration → Document:** REST call on auto-save (or via message queue)
- **Document → Version:** Direct function call (currently) → event-driven via **RabbitMQ/Kafka** in full microservices
- **Collaboration (multi-instance):** Redis Pub/Sub via `socket.io-redis` adapter

---

## Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Environment Setup

```bash
# Server environment (server/.env)
PORT=5000
MONGODB_URI=mongodb://localhost:27017/collab-platform
JWT_SECRET=your_super_secret_key_here
CLIENT_URL=http://localhost:5173
```

```bash
# Client environment (client/.env)
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### Running the App

```bash
# Install server dependencies
cd server
npm install
npm run dev          # starts with nodemon on port 5000

# In another terminal, install client dependencies
cd client
npm install
npm run dev          # starts Vite dev server on port 5173
```

### Project Scripts

| Directory | Command | Action |
|-----------|---------|--------|
| `server/` | `npm run dev` | Start server with Nodemon (auto-restart) |
| `server/` | `node server.js` | Start server (production mode) |
| `client/` | `npm run dev` | Start Vite dev server with HMR |
| `client/` | `npm run build` | Build production bundle to `dist/` |
| `client/` | `npm run preview` | Preview production build locally |

---

*Last Updated: February 2026*
