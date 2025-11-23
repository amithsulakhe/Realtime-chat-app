import ChatWindow from "@/components/ChatWindow";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat App - WhatsApp Style Tagging",
  description: "Chat application with dynamic autocomplete and tagging",
};

export default function Home() {
  return <ChatWindow />;
}