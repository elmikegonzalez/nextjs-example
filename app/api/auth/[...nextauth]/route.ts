import NextAuth, { Session, User } from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import FacebookProvider from 'next-auth/providers/facebook';
import debugLogger from '@/app/utils/debug-logger';

// Validate environment variables
const requiredEnvVars = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'GITHUB_ID',
  'GITHUB_SECRET',
  'FACEBOOK_CLIENT_ID',
  'FACEBOOK_CLIENT_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Log environment variables (excluding secrets)
debugLogger.group('Auth Configuration', () => {
  debugLogger.info('Environment:', {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GITHUB_ID: !!process.env.GITHUB_ID,
    FACEBOOK_CLIENT_ID: !!process.env.FACEBOOK_CLIENT_ID,
    NODE_ENV: process.env.NODE_ENV,
    DEBUG: process.env.NEXTAUTH_DEBUG === 'true'
  });
});

// Extend the built-in session type
interface ExtendedSession extends Session {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }
}

const handler = NextAuth({
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      profile(profile: any) {
        debugLogger.info('Facebook profile:', { 
          id: profile.id,
          name: profile.name,
          email: profile.email,
          hasImage: !!profile.picture?.data?.url 
        });
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          image: profile.picture?.data?.url,
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      debugLogger.group('Sign In Attempt', () => {
        debugLogger.info('User:', { 
          id: (user as User & { id: string }).id,
          email: user.email,
          name: user.name,
          provider: account?.provider 
        });
      });

      if (!user.email) {
        debugLogger.error('No email provided by OAuth provider');
        return false;
      }

      return true;
    },
    async session({ session, token }) {
      debugLogger.group('Session Update', () => {
        debugLogger.info('Session:', {
          expires: session.expires,
          hasUser: !!session.user,
          hasToken: !!token
        });
      });

      const extendedSession = session as ExtendedSession;
      
      // Add user ID to session from token
      if (token && extendedSession.user) {
        extendedSession.user.id = token.sub;
      }

      return extendedSession;
    },
    async jwt({ token, user, account }) {
      debugLogger.group('JWT Update', () => {
        debugLogger.info('Token:', {
          sub: token.sub,
          hasUser: !!user,
          provider: account?.provider
        });
      });

      // If this is the first sign in, add additional data to token
      if (account && user) {
        token.provider = account.provider;
        token.userId = (user as User & { id: string }).id;
      }

      return token;
    },
    async redirect({ url, baseUrl }) {
      debugLogger.info('Redirect:', { url, baseUrl });
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  debug: process.env.NEXTAUTH_DEBUG === 'true',
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  events: {
    async signIn(message) {
      debugLogger.success('User signed in successfully');
    },
    async signOut() {
      debugLogger.info('User signed out successfully');
    }
  },
  // Enable secure cookies in production
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  }
});

export { handler as GET, handler as POST };