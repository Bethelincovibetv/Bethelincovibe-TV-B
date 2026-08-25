import { useSearchParams } from "react-router-dom";
import VixoraStudioApp from "@/vixora/App";

export default function VideoCreator() {
  const [searchParams] = useSearchParams();
  const topicParam = searchParams.get("topic") || "";

  return <VixoraStudioApp initialTopic={topicParam} />;
}


