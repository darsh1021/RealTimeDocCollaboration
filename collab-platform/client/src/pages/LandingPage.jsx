import React from 'react';
import { Share2, Users, Zap, Shield, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen hero-gradient flex flex-col items-center justify-center p-6 md:p-12 overflow-hidden relative">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-600/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

            {/* Navigation Placeholder */}
            <nav className="absolute top-0 w-full flex justify-between items-center p-8 max-w-7xl">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
                        <Share2 className="text-white w-6 h-6" />
                    </div>
                    <span className="text-2xl font-bold tracking-tight text-white">CollabSync</span>
                </div>
                <div className="hidden md:flex gap-8 items-center text-slate-300">
                    <a href="#" className="hover:text-white transition-colors">Features</a>
                    <a href="#" className="hover:text-white transition-colors">Pricing</a>
                    <a href="#" className="hover:text-white transition-colors">About</a>
                    <button className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-full border border-white/10 transition-all backdrop-blur-md">
                        Login
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="max-w-4xl text-center z-10 animate-fade-in mt-20">
                <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm font-medium">
                    Real-time collaboration made simple
                </div>
                <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-8 tracking-tight leading-[1.1]">
                    Create, Share, and <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-blue-500">
                        Collaborate in Real-Time
                    </span>
                </h1>
                <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
                    Build seamless experiences together. A powerful platform for teams to work on documents, code, and projects with zero latency.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="group px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-semibold text-lg flex items-center gap-2 transition-all shadow-xl shadow-primary-500/20 hover:scale-105 active:scale-95"
                    >
                        Get Started
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-semibold text-lg transition-all border border-white/10 backdrop-blur-sm">
                        Watch Demo
                    </button>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 text-left">
                    <div className="glass p-8 rounded-3xl animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        <div className="w-12 h-12 bg-primary-500/20 rounded-2xl flex items-center justify-center mb-6">
                            <Zap className="text-primary-400 w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Instant Sync</h3>
                        <p className="text-slate-400">Experience zero latency with our rock-solid Socket.io implementation.</p>
                    </div>
                    <div className="glass p-8 rounded-3xl animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6">
                            <Users className="text-blue-400 w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Multiplayer</h3>
                        <p className="text-slate-400">Collaborate with hundreds of users simultaneously on a single project.</p>
                    </div>
                    <div className="glass p-8 rounded-3xl animate-slide-up" style={{ animationDelay: '0.3s' }}>
                        <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6">
                            <Shield className="text-emerald-400 w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Secure</h3>
                        <p className="text-slate-400">Enterprise grade security with JWT and protected websockets.</p>
                    </div>
                </div>
            </main>

            {/* Footer Placeholder */}
            <footer className="mt-24 text-slate-500 text-sm">
                &copy; 2026 CollabSync. All rights reserved. Built with MERN Stack.
            </footer>
        </div>
    );
};

export default LandingPage;
