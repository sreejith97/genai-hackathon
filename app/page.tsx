import AdvocateApp from "@/components/advocate/AdvocateApp";

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-background flex flex-col items-center p-4 sm:p-8 pt-12 md:pt-24">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/20 blur-[120px] pointer-events-none z-0" />

      {/* App Container */}
      <div className="w-full h-full relative z-10 flex flex-col max-w-6xl">
        <AdvocateApp />
      </div>
    </main>
  );
}
