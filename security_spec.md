# Bethelincovibe TV Chat & Communication Security Specification

## 1. Overview
This specification details the security architecture, data validation rules, and role-based access controls (RBAC) governing the Bethelincovibe TV real-time communications infrastructure, which includes messaging, group discussion lounges, audio/video WebRTC calling, online presence, and media attachments.

---

## 2. Authentication & Identity
- **Dual-Auth Synchronization**: Supabase Auth serves as the user management layer, while Firebase Authentication (`ensureFirebaseAuth`) provides synchronized anonymous or custom-credential tokens required for Firestore and Firebase Storage access.
- **Platform Administrators**:
  Authorized super-admin emails:
  - `goodgiftdigital@gmail.com`
  - `bethelincovibetv@gmail.com`
  - `bethelgoodgift3@gmail.com`
  - `bethelchukwunyere1@gmail.com`
  Platform admins possess elevated permissions to moderate all public community rooms, delete inappropriate content, and enforce system security.

---

## 3. Role-Based Access Control (RBAC) in Discussion Lounges
Each chat room supports a hierarchical governance model:
1. **Room Creator (Owner)**:
   - Full control over room metadata, name, description, and avatar.
   - Can promote members to Admin or Moderator.
   - Can delete the chat room.
   - Cannot be demoted or removed by regular admins.
2. **Group Admin**:
   - Can modify room settings and announcement-only posting permissions (`onlyAdminsCanPost`).
   - Can add and remove regular members and moderators.
   - Can promote members to Moderator or Admin.
3. **Group Moderator**:
   - Can remove offending messages or spam content (`deleteMessageForEveryone`).
   - Can assist in member onboarding and moderation.
4. **Member (Participant)**:
   - Can send messages, voice notes, attachments, and emoji reactions when the room is open.
   - Can start direct audio/video calls with fellow participants.
   - Receives real-time unread counts and typing indicators.

---

## 4. WebRTC Calling Security & Privacy
- **Direct Peer-to-Peer**: Video and voice media streams are encrypted end-to-end (DTLS-SRTP) directly between peer browsers.
- **Signaling Security**:
  - The Firestore `calls/{callId}` collection holds only transient session descriptors (SDP) and ICE candidates.
  - No raw audio or video bytes ever touch Firestore or database logs.
  - Calls auto-terminate and clean up signaling channels upon state change to `ended` or `declined`.

---

## 5. Media & Storage Security
- **MIME & Size Enforcements**:
  - Images: `image/jpeg`, `image/png`, `image/webp`, `image/gif` (Max 15MB).
  - Videos: `video/mp4`, `video/webm` (Max 15MB).
  - Voice Notes: `audio/webm`, `audio/ogg`, `audio/mp4` (Max 15MB).
  - Documents/Files: `application/pdf`, `text/plain`, archives (Max 15MB).
- **Redundant Storage Path**: Primary uploads route to Firebase Storage (`chat_media/*`); if an endpoint constraint occurs, the client automatically falls back to Supabase Storage or data URI representations without interrupting messaging.

---

## 6. Presence & Anti-Abuse
- **Presence Heartbeats**: Presence pings expire after inactivity; visibility listeners flag inactive tabs as offline.
- **Typing Freshness**: Typing indicators auto-expire after 10 seconds of silence to prevent stuck UI state.
- **Message Integrity**: Message documents enforce sender identification, recipient indexing, and server-side timestamps.
