import React from 'react';

export const AuthLayout: React.FC<{ children: React.ReactNode; title: string; subtitle: string }> = ({
    children,
    title,
    subtitle,
}) => {
    return (
        <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
            {/* Left Col - Welcome & Branding (Hidden on mobile) */}
            <div className="hidden lg:flex flex-col justify-between bg-zinc-900 p-12 relative overflow-hidden">
                {/* Branding Top Left */}
                <div className="z-10">
                    <div className="inline-flex items-center gap-2 font-bold text-xl text-white">
                        <span className="text-2xl">🌸</span>
                        <span>Period Cycle Planner</span>
                    </div>
                </div>

                {/* Main Welcome Content */}
                <div className="z-10 max-w-lg mb-20 text-white">
                    <h1 className="text-4xl font-extrabold tracking-tight mb-6 leading-tight">
                        Plan your activities <br />
                        <span className="text-primary-foreground/90">while tracking your cycle.</span>
                    </h1>
                    <p className="text-lg text-zinc-400 leading-relaxed">
                        Stay in sync with your body. Organize your life around your natural rhythm with intelligent insights and planning tools.
                    </p>
                </div>

                {/* Footer Copyright */}
                <div className="z-10 text-sm text-zinc-500">
                    © {new Date().getFullYear()} Period Cycle Planner. All rights reserved.
                </div>

                {/* Decorative Background Elements */}
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>
                <div className="absolute top-[40%] left-[20%] w-[20%] h-[20%] bg-pink-500/20 rounded-full blur-2xl animate-pulse delay-300"></div>
            </div>

            {/* Right Col - Form */}
            <div className="flex items-center justify-center p-8 bg-background relative">
                {/* Mobile Decoration (only visible on small screens) */}
                <div className="lg:hidden absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-phase-period-light/30 rounded-full blur-3xl"></div>

                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px] relative z-10 animate-fade-in">
                    <div className="flex flex-col space-y-2 text-center lg:text-left">
                        {/* Mobile Branding Icon */}
                        <div className="lg:hidden mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">🌸</span>
                        </div>

                        <h1 className="text-2xl font-semibold tracking-tight">
                            {title}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {subtitle}
                        </p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
};
