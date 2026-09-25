import fs from "node:fs";

const path = "src/pages/UserMessages.tsx";
let s = fs.readFileSync(path, "utf8");
let changed = false;

s = s.replace(/\n\s*const \[optimisticRooms, setOptimisticRooms\] = useState<Record<string, RealtimeChatRoom>>\(\{\}\);/, "");

const oldCombine = /const allRooms = useMemo\(\(\) => \{[\s\S]*?\n  \}, \[userRooms, publicRooms, optimisticRooms\]\);/;
const newCombine = `const allRooms = useMemo(() => {
    const map = new Map<string, RealtimeChatRoom>();
    userRooms.forEach((r) => map.set(r.id, r));
    publicRooms.forEach((r) => {
      if (!map.has(r.id)) map.set(r.id, r);
    });
    return Array.from(map.values()).sort((a, b) => {
      const tA = new Date(a.lastMessageTime || a.createdAt || 0).getTime();
      const tB = new Date(b.lastMessageTime || b.createdAt || 0).getTime();
      return tB - tA;
    });
  }, [userRooms, publicRooms]);`;
if (oldCombine.test(s)) { s = s.replace(oldCombine, newCombine); changed = true; }

const oldUrlBlock = /    \} else if \(targetUserParam\) \{[\s\S]*?      getOrCreateChatRoom\([\s\S]*?      \)\.catch\(console\.warn\);\n    \}/;
const newUrlBlock = `    } else if (targetUserParam) {
      const tName = targetNameParam || "Bethelincovibe Member";
      setLoading(true);
      getOrCreateChatRoom(
        currentUserId,
        currentUserName,
        targetUserParam,
        tName,
        targetAvatarParam || undefined,
        undefined,
        currentUserAvatar
      ).then((room) => {
        const id = typeof room === "string" ? room : (room?.id || "");
        setActiveRoomId(id);
        setMobileView("chat");
        setLoading(false);
      }).catch((err) => {
        setLoading(false);
        toast.error(err?.message || "Could not create this conversation");
      });
    }`;
if (oldUrlBlock.test(s)) { s = s.replace(oldUrlBlock, newUrlBlock); changed = true; }

const oldDirectBlock = /  const handleStartDirectChat = async \(contact: \{ id: string; name: string; avatar\?: string \}\) => \{[\s\S]*?    getOrCreateChatRoom\([\s\S]*?    \)\.catch\(console\.warn\);\n  \};/;
const newDirectBlock = `  const handleStartDirectChat = async (contact: { id: string; name: string; avatar?: string }) => {
    try {
      setLoading(true);
      const room = await getOrCreateChatRoom(
        currentUserId,
        currentUserName,
        contact.id,
        contact.name,
        contact.avatar,
        undefined,
        currentUserAvatar
      );
      const targetRoomId = typeof room === "string" ? room : (room?.id || "");
      setActiveRoomId(targetRoomId);
      setDirectorySearch("");
      setDiscoveredContacts([]);
      setMobileView("chat");
      setLoading(false);
      toast.success(\`Connected to chat with \${contact.name}\`);
    } catch (err) {
      setLoading(false);
      toast.error(err?.message || "Could not start this conversation");
    }
  };`;
if (oldDirectBlock.test(s)) { s = s.replace(oldDirectBlock, newDirectBlock); changed = true; }

if (changed) fs.writeFileSync(path, s);
console.log(changed ? "Chat runtime source patched." : "Chat runtime already patched.");
