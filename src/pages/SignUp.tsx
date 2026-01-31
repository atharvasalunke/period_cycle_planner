import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const SignUp = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { signup } = useAuth();
    const navigate = useNavigate();

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstName || !lastName || !email || !password || !confirmPassword || !dateOfBirth) {
            toast.error('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        try {
            setIsLoading(true);
            await signup(email, password, firstName, lastName, dateOfBirth);
            toast.success('Account created successfully!');
            navigate('/');
        } catch (error) {
            toast.error('Failed to create account');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Create Account"
            subtitle="Join to start tracking your cycle and productivity"
        >
            <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                            id="firstName"
                            type="text"
                            placeholder="Jane"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            disabled={isLoading}
                            className="rounded-xl border-muted-foreground/20 focus-visible:ring-primary"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                            id="lastName"
                            type="text"
                            placeholder="Doe"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            disabled={isLoading}
                            className="rounded-xl border-muted-foreground/20 focus-visible:ring-primary"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        className="rounded-xl border-muted-foreground/20 focus-visible:ring-primary"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                        id="dateOfBirth"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        disabled={isLoading}
                        className="rounded-xl border-muted-foreground/20 focus-visible:ring-primary"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        className="rounded-xl border-muted-foreground/20 focus-visible:ring-primary"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                        className="rounded-xl border-muted-foreground/20 focus-visible:ring-primary"
                        required
                    />
                </div>
                <Button
                    type="submit"
                    className="w-full rounded-xl py-6 font-semibold shadow-sm transition-all hover:scale-[1.01] mt-2"
                    disabled={isLoading}
                >
                    {isLoading ? 'Creating account...' : 'Sign up'}
                </Button>
            </form >

            <p className="mt-8 text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline font-semibold">
                    Sign in instead
                </Link>
            </p>
        </AuthLayout >
    );
};

export default SignUp;
