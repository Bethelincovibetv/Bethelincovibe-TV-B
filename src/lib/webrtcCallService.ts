import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  deleteDoc,
  addDoc,
} from "firebase/firestore";
import { ensureFirebaseAuth, firestoreDb } from "@/lib/firebaseChat";

export type CallKind = "voice" | "video";
export type CallState = "ringing" | "accepted" | "declined" | "ended";

export interface CallRecord {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  participantIds: string[];
  kind: CallKind;
  state: CallState;
  createdAt?: any;
}

export interface CallPeerSignal {
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
}

const calls = collection(firestoreDb, "calls");

export async function createCall(params: {
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  participantIds: string[];
  kind: CallKind;
}): Promise<string> {
  await ensureFirebaseAuth();
  const participantIds = Array.from(new Set(params.participantIds.filter(Boolean)));
  if (!participantIds.length) throw new Error("No call recipient selected");

  const ref = doc(calls);
  await setDoc(ref, {
    callerId: params.callerId,
    callerName: params.callerName,
    callerAvatar: params.callerAvatar || null,
    participantIds,
    kind: params.kind,
    state: "ringing",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCallState(callId: string, state: CallState) {
  await ensureFirebaseAuth();
  await updateDoc(doc(calls, callId), { state, updatedAt: serverTimestamp() });
}

export async function endCall(callId: string) {
  try {
    await updateCallState(callId, "ended");
  } catch (error) {
    console.warn("Failed to update call state:", error);
  }
}

export function listenForIncomingCalls(
  userId: string,
  callback: (call: CallRecord) => void
) {
  const q = query(calls, where("participantIds", "array-contains", userId));
  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type !== "added" && change.type !== "modified") return;
      const data = change.doc.data() as Omit<CallRecord, "id">;
      if (data.callerId === userId) return;
      if (data.state !== "ringing") return;
      callback({ id: change.doc.id, ...data });
    });
  }, (error) => console.warn("Incoming call listener failed:", error));
}

export function listenToCall(callId: string, callback: (call: CallRecord | null) => void) {
  return onSnapshot(doc(calls, callId), (snap) => {
    if (!snap.exists()) return callback(null);
    callback({ id: snap.id, ...(snap.data() as Omit<CallRecord, "id">) });
  }, (error) => console.warn("Call listener failed:", error));
}

export function peerKey(a: string, b: string) {
  return [a, b].sort().join("__");
}

export async function writePeerOffer(callId: string, a: string, b: string, offer: RTCSessionDescriptionInit) {
  await setDoc(doc(calls, callId, "peers", peerKey(a, b)), { offer, offerFrom: a, updatedAt: serverTimestamp() }, { merge: true });
}

export async function writePeerAnswer(callId: string, a: string, b: string, answer: RTCSessionDescriptionInit) {
  await setDoc(doc(calls, callId, "peers", peerKey(a, b)), { answer, answerFrom: a, updatedAt: serverTimestamp() }, { merge: true });
}

export function listenToPeerSignal(callId: string, a: string, b: string, callback: (signal: CallPeerSignal) => void) {
  return onSnapshot(doc(calls, callId, "peers", peerKey(a, b)), (snap) => {
    if (snap.exists()) callback(snap.data() as CallPeerSignal);
  });
}

export async function addIceCandidate(callId: string, a: string, b: string, candidate: RTCIceCandidateInit) {
  await addDoc(collection(calls, callId, "peers", peerKey(a, b), "candidates"), {
    from: a,
    candidate,
    createdAt: serverTimestamp(),
  });
}

export function listenToIceCandidates(callId: string, a: string, b: string, localUserId: string, callback: (candidate: RTCIceCandidateInit) => void) {
  return onSnapshot(collection(calls, callId, "peers", peerKey(a, b), "candidates"), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type !== "added") return;
      const data = change.doc.data() as { from?: string; candidate?: RTCIceCandidateInit };
      if (data.from && data.from !== localUserId && data.candidate) callback(data.candidate);
    });
  });
}

export async function deleteCall(callId: string) {
  await deleteDoc(doc(calls, callId));
}
