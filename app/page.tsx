"use client";

import { motion } from "framer-motion";
import { Camera, Image as ImageIcon, Users, ArrowRight, Zap, Shield, Sparkles } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FDFDFD] text-zinc-900 overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-50 via-[#FDFDFD] to-[#FDFDFD] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.015] pointer-events-none z-0 mix-blend-multiply" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12 border-b border-black/5 bg-white/60 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-black/[0.03] border border-black/[0.06]">
            <Camera className="w-4 h-4 text-zinc-800" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-zinc-900">FotoSpace</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium bg-zinc-900 text-white px-4 py-2 rounded-full hover:bg-zinc-800 transition-colors shadow-sm"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-32 text-center">

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="max-w-4xl text-5xl md:text-7xl font-bold tracking-tighter text-zinc-900 mb-6 leading-[1.1]"
        >
          Deliver Memories with <span className="text-zinc-400 font-light italic">Elegance</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="max-w-2xl text-lg md:text-xl text-zinc-500 mb-10 leading-relaxed font-light"
        >
          Elevate your event photography. FotoSpace provides high-speed, secure, and stunning client galleries powered by AI curation. Designed for modern professionals.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center"
        >
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-zinc-900 text-white rounded-full font-medium hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-900/20 group"
          >
            Create Your First Space
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

      
      </main>
    </div>
  );
}
