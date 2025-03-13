'use client';

import {
    signIn,
    signOut,
    useSession,
} from 'next-auth/react';

const Profile = () => {
    const { status, data } = useSession();

    if (status === 'authenticated') {
        return (
            <div className='flex items-center gap-3'>
                <span className='text-sm font-medium'>Hi, {data.user?.email}</span>
                <button id='sign-out'
                        className='text-sm bg-slate-900 text-background font-semibold px-3 py-2 rounded-lg'
                        onClick={async () => {
                            // Use absolute URL path for callback
                            await signOut({ callbackUrl: '/post-authentication' });
                        }}
                >
                    Logout
                </button>
            </div>
        );
    }

    return (
        <button
            className='text-sm bg-slate-900 text-background font-semibold px-3 py-2 rounded-lg'
            onClick={() => {
                // Use absolute URL path for callback
                signIn(undefined, { callbackUrl: '/post-authentication' });
            }
            }
        >
            Login
        </button>
    );
};

export default Profile;