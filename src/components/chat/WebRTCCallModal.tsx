import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, Lock, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { collection, getDocs, query, where } from "firebase/firestore";
import { supabase } from "@/integrations/supabase/client";
import { firestoreDb } from "@/lib/firebaseChat";
import { addIceCandidate, CallRecord, createCall, endCall, listenForIncomingCalls, listenForIceCandidates, listenToCall, listenToPeerSignal, peerKey, updateCallState, writePeerAnswer, writePeerOffer } from "@/lib/webrtcCallService";
import { chatSounds } from "@/lib/chatSounds";

export interface WebRTCCallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser?: { id?: string; name?: string; avatar?: string; role?: string };
  participantIds?: string[];
  contactName?: string;
  contactAvatar?: string;
  contactRole?: string;
  isVideo?: boolean;
  isIncoming?: boolean;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ],
};

type CallStatus = "calling" | "ringing" | "connecting" | "connected" | "ended" | "declined";

export function WebRTCCallModal({
  open,
  onOpenChange,
  targetUser,
  participantIds,
  contactName,
  contactAvatar,
  contactRole,
  isVideo = false,
}: WebRTCCallModalProps) {
  const [localUserId, setLocalUserId] = useState("");
  const [localName, setLocalName] = useState("Bethel Member");
  const [localAvatar, setLocalAvatar] = useState("");
  const [internalOpen, setInternalOpen] = useState(false);
  const [call, setCall] = useState<CallRecord | null>(null);
  const [status, setStatus] = useState<CallStatus>("calling");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [quality, setQuality] = useState<"good" | "reconnecting">("good");
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const unsubRef = useRef<(() => void)[]>([]);
  const startedPeersRef = useRef<Set<string>>(new Set());
  const incomingSeenRef = useRef<Set<string>>(new Set());

  // Ringtone and call audio sound effects
  useEffect(() => {
    if (!open && !internalOpen) {
      chatSounds.stopRingtone();
      return;
    }
    if (status === "ringing" || status === "calling") {
      chatSounds.playRingtone();
    } else if (status === "connected") {
      chatSounds.playCallConnected();
    } else if (status === "ended" || status === "declined") {
      chatSounds.playCallEnded();
    }
    return () => {
      chatSounds.stopRingtone();
    };
  }, [status, open, internalOpen]);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return;
      setLocalUserId(data.user.id);
      setLocalName(data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "Bethel Member");
      setLocalAvatar(data.user.user_metadata?.avatar_url || "");
    });
    return () => { cancelled = true; };
  }, []);

  const effectiveVideo = call ? call.kind === "video" : isVideo;
  const displayName = call && call.callerId !== localUserId
    ? call.callerName
    : (targetUser?.name || contactName || "Bethel Community Member");
  const displayAvatar = call && call.callerId !== localUserId
    ? (call.callerAvatar || "")
    : (targetUser?.avatar || contactAvatar || "");

  // Always listen for incoming calls, but NEVER accept them automatically.
  useEffect(() => {
    if (!localUserId) return;
    return listenForIncomingCalls(localUserId, (incoming) => {
      if (incomingSeenRef.current.has(incoming.id)) return;
      if (incoming.callerId === localUserId) return;
      incomingSeenRef.current.add(incoming.id);
      setCall(incoming);
      setStatus("ringing");
      setSeconds(0);
      setInternalOpen(true);
    });
  }, [localUserId]);

  // Outgoing call creation. We create the call as ringing and wait for the
  // remote user to accept before treating the media connection as active.
  useEffect(() => {
    if (!open || !localUserId || call) return;
    let cancelled = false;

    (async () => {
      try {
        const targetId = targetUser?.id;
        const targetName = targetUser?.name || contactName || "";
        const snap = await getDocs(
          query(collection(firestoreDb, "chats"), where("participants", "array-contains", localUserId))
        );

        let room: any = null;
        snap.forEach((item) => {
          const data = item.data();
          const participants = Array.isArray(data.participants) ? data.participants : [];
          const names = Object.values(data.participantNames || {}) as string[];
          if (!room && (
            (targetId && participants.includes(targetId)) ||
            (!!targetName && (data.name === targetName || names.includes(targetName)))
          )) {
            room = data;
          }
        });

        const participants = (participantIds && participantIds.length > 0)
          ? participantIds.filter((id: string) => id !== localUserId)
          : room?.participants?.filter((id: string) => id !== localUserId) || (targetId ? [targetId] : []);
        if (!participants.length) throw new Error("No callable participant found in this conversation");

        const kind = isVideo ? "video" : "voice";
        const callId = await createCall({
          callerId: localUserId,
          callerName: localName,
          callerAvatar: localAvatar,
          participantIds: participants,
          kind,
        });

        if (cancelled) return;
        setCall({
          id: callId,
          callerId: localUserId,
          callerName: localName,
          callerAvatar: localAvatar,
          participantIds: participants,
          kind,
          state: "ringing",
        });
        setStatus("calling");
        setSeconds(0);
        setInternalOpen(true);
      } catch (error: any) {
        if (!cancelled) {
          toast.error(error?.message || "Unable to start call");
          onOpenChange(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [open, localUserId, isVideo, targetUser?.id, targetUser?.name, contactName, call, localName, localAvatar, onOpenChange]);

  useEffect(() => {
    if (!call?.id) return;
    return listenToCall(call.id, (updated) => {
      if (!updated) return;
      setCall(updated);
      if (updated.state === "accepted") {
        // Accepted means the remote party answered. Media is only "connected"
        // after the RTCPeerConnection itself reaches a connected state.
        setStatus("connecting");
      }
      if (updated.state === "declined") setStatus("declined");
      if (updated.state === "ended") setStatus("ended");
    });
  }, [call?.id]);

  // Caller may prepare media while ringing; callee is deliberately blocked
  // until the user presses Accept. This prevents the old auto-answer bug.
  useEffect(() => {
    if (!call?.id || !localUserId || status === "ended" || status === "declined" || status === "ringing") return;
    let cancelled = false;

    (async () => {
      try {
        if (!localStreamRef.current) {
          localStreamRef.current = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: call.kind === "video" ? { facingMode: "user" } : false,
          });
        }

        for (const remoteId of call.participantIds.filter((id) => id !== localUserId)) {
          if (!cancelled && !peersRef.current[remoteId]) {
            await connectPeer(remoteId, localUserId < remoteId);
          }
        }
      } catch (error: any) {
        if (!cancelled) {
          toast.error(error?.name === "NotAllowedError"
            ? "Microphone/camera permission is required"
            : "Could not access your microphone/camera");
          await endCall(call.id);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [call?.id, call?.participantIds?.join(","), call?.kind, status, localUserId]);

  const connectPeer = async (remoteId: string, initiator: boolean) => {
    if (!call || peersRef.current[remoteId]) return;

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peersRef.current[remoteId] = pc;
    localStreamRef.current?.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) setRemoteStreams((prev) => ({ ...prev, [remoteId]: stream }));
    };

    pc.oniceconnectionstatechange = () => {
      if (["failed", "disconnected"].includes(pc.iceConnectionState)) setQuality("reconnecting");
      if (["connected", "completed"].includes(pc.iceConnectionState)) {
        setQuality("good");
        setStatus("connected");
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setStatus("connected");
      if (["failed", "disconnected"].includes(pc.connectionState)) setQuality("reconnecting");
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        void addIceCandidate(call.id, localUserId, remoteId, event.candidate.toJSON());
      }
    };

    unsubRef.current.push(
      listenToPeerSignal(call.id, localUserId, remoteId, async (signal) => {
        try {
          if (signal.offer && !initiator && !pc.remoteDescription) {
            await pc.setRemoteDescription(signal.offer);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await writePeerAnswer(call.id, localUserId, remoteId, answer);
          } else if (signal.answer && initiator && !pc.remoteDescription) {
            await pc.setRemoteDescription(signal.answer);
          }
        } catch (error) {
          console.warn("WebRTC signaling error", error);
        }
      })
    );

    unsubRef.current.push(
      listenToIceCandidates(call.id, localUserId, remoteId, localUserId, async (candidate) => {
        try {
          await pc.addIceCandidate(candidate);
        } catch (error) {
          console.warn("ICE candidate error", error);
        }
      })
    );

    const key = peerKey(localUserId, remoteId);
    if (initiator && !startedPeersRef.current.has(key)) {
      startedPeersRef.current.add(key);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await writePeerOffer(call.id, localUserId, remoteId, offer);
    }
  };

  useEffect(() => {
    if (status !== "connected") return;
    const timer = window.setInterval(() => setSeconds((v) => v + 1), 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  const acceptIncomingCall = async () => {
    if (!call || status !== "ringing") return;
    try {
      setStatus("connecting");
      await updateCallState(call.id, "accepted");
    } catch (error: any) {
      toast.error(error?.message || "Could not accept call");
      await cleanup("ended");
    }
  };

  const cleanup = async (state: "ended" | "declined" = "ended") => {
    if (call?.id) {
      if (state === "declined") await updateCallState(call.id, "declined");
      else await endCall(call.id);
    }

    unsubRef.current.splice(0).forEach((fn) => { try { fn(); } catch {} });
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    startedPeersRef.current.clear();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setRemoteStreams({});
    setStatus(state);
    setTimeout(() => {
      setInternalOpen(false);
      onOpenChange(false);
    }, 200);
  };

  const remoteEntries = Object.entries(remoteStreams);
  const duration = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <Dialog open={internalOpen || open} onOpenChange={(value) => { if (!value) void cleanup(); }}>
      <DialogContent className="w-[94vw] max-w-2xl rounded-3xl p-5 sm:p-6 bg-gradient-to-b from-slate-950 via-zinc-950 to-black text-white border-white/10 shadow-2xl flex flex-col items-center min-h-[430px]">
        <div className="w-full flex justify-between text-[10px] font-bold uppercase tracking-wide text-white/60">
          <span className="flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 px-2.5 py-1 rounded-full"><Lock className="w-3 h-3" /> End-to-End Media</span>
          <span className="flex items-center gap-1">{quality === "good" ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-amber-400" />} WebRTC</span>
        </div>

        {effectiveVideo && status === "connected" ? (
          <div className={`w-full my-4 grid gap-2 ${remoteEntries.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {remoteEntries.length ? remoteEntries.map(([remoteId, stream]) => (
              <div key={remoteId} className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/10">
                <video autoPlay playsInline ref={(el) => { if (el) el.srcObject = stream; }} className="w-full h-full object-cover" />
                <span className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-1 text-[10px]">Participant</span>
              </div>
            )) : <div className="aspect-video rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center text-white/50 text-sm">Waiting for participants…</div>}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center my-auto space-y-4">
            <Avatar className="w-24 h-24 ring-4 ring-emerald-500/40"><AvatarImage src={displayAvatar} /><AvatarFallback className="bg-emerald-600 text-white text-2xl font-black">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
            <div><h3 className="text-xl font-extrabold">{displayName}</h3><p className="text-xs text-white/60">{targetUser?.role || contactRole || (effectiveVideo ? "Group Video Call" : "Voice Call")}</p></div>
            <p className="text-sm font-semibold text-emerald-400">
              {status === "calling" ? "Calling…"
                : status === "ringing" ? `Incoming ${effectiveVideo ? "video" : "voice"} call…`
                : status === "connecting" ? "Connecting…"
                : status === "connected" ? duration
                : status === "declined" ? "Call declined" : "Call ended"}
            </p>
            <audio autoPlay playsInline ref={(el) => { if (el && remoteEntries[0]) el.srcObject = remoteEntries[0][1]; }} />
          </div>
        )}

        <div className="w-full pt-4 border-t border-white/10 flex items-center justify-center gap-3">
          {status === "ringing" ? (
            <>
              <Button onClick={() => void cleanup("declined")} size="icon" className="w-14 h-14 rounded-full bg-rose-600"><PhoneOff /></Button>
              <Button onClick={() => void acceptIncomingCall()} size="icon" className="w-14 h-14 rounded-full bg-emerald-600 animate-pulse"><Phone /></Button>
            </>
          ) : status === "connected" ? (
            <>
              <Button onClick={() => { const next = !muted; localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !next; }); setMuted(next); }} size="icon" className="w-11 h-11 rounded-full bg-white/10">{muted ? <MicOff /> : <Mic />}</Button>
              {effectiveVideo && <Button onClick={() => { const next = !cameraOff; localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !next; }); setCameraOff(next); }} size="icon" className="w-11 h-11 rounded-full bg-white/10">{cameraOff ? <VideoOff /> : <Video />}</Button>}
              <Button onClick={() => setSpeakerOn((v) => !v)} size="icon" className={`w-11 h-11 rounded-full ${speakerOn ? "bg-white/10" : "bg-amber-500/20"}`}><Volume2 /></Button>
              <Button onClick={() => void cleanup()} size="icon" className="w-12 h-12 rounded-full bg-rose-600"><PhoneOff /></Button>
            </>
          ) : (
            <Button onClick={() => void cleanup()} size="icon" className="w-14 h-14 rounded-full bg-rose-600"><PhoneOff /></Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
