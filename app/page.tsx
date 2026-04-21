import { ChatLayout } from "@/components/chat/ChatLayout";

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-background flex flex-col items-center justify-center p-4 sm:p-8 md:p-24">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none" />

      {/* Chat App Container */}
      <div className="w-full h-full max-h-[800px] max-w-5xl relative z-10 flex flex-col bg-">
        <ChatLayout />
      </div>
    </main>
  );
}
