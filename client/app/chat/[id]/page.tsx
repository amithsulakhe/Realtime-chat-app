import { Metadata } from "next";
import ChatWindow from "../../../components/ChatWindow";

export const metadata: Metadata = {
  title: "Chat",
  description: "Chat",
};  

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ChatWindow conversationId={id} />;
}
