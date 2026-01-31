import React from 'react';

export const AuthLayout: React.FC<{ children: React.ReactNode; title: string; subtitle: string }> = ({
    children,
    title,
    subtitle,
}) => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-phase-period-light/30 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-phase-ovulation-light/20 rounded-full blur-3xl animate-pulse delay-700"></div>

            <div className="w-full max-w-md space-y-8 relative z-10 animate-fade-in">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6 border border-primary/20">
                        <span className="text-3xl">🌸</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
                    <p className="mt-2 text-muted-foreground">{subtitle}</p>
                </div>

                <div className="bg-card border rounded-3xl p-8 shadow-soft">
                    {children}
                </div>

                <p className="text-center text-xs text-muted-foreground">
                    © {new Date().getFullYear()} Period Cycle Planner. Your data stays on your device.
                </p>
            </div>
        </div>
    );
};
