import Link from "next/link";
import Twemoji from "@/components/ui/Twemoji";

export const metadata = {
  title: "Welcome",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-brand-mist flex flex-col items-center justify-center p-6">
      {/* Heading */}
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-slate-800">Patient System</h1>
        <p className="text-slate-500 mt-2 text-sm">Please select your role to continue</p>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
        <Link
          href="/patient"
          className="group bg-white hover:bg-white border border-brand-soft/60 hover:border-brand-purple rounded-2xl p-8 flex flex-col items-center gap-4 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <Twemoji className="text-4xl">🙋‍♂️</Twemoji>
          <div className="text-center">
            <p className="text-slate-800 font-semibold text-base">Patient</p>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
              Fill in your personal information for registration
            </p>
          </div>
        </Link>

        <Link
          href="/staff"
          className="group bg-white hover:bg-white border border-brand-soft/60 hover:border-brand-purple rounded-2xl p-8 flex flex-col items-center gap-4 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <Twemoji className="text-4xl">👨‍💻</Twemoji>
          <div className="text-center">
            <p className="text-slate-800 font-semibold text-base">Staff</p>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
              Monitor patient submissions in real-time
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
