import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions, getServerSession } from "next-auth";
import { DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Extend the NextAuth types for better TypeScript support
declare module "next-auth" {
  interface NextAuthOptions {
    allowDangerousEmailAccountLinking?: boolean;
  }
  
  interface Session extends DefaultSession {
    user?: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}

// Create a single PrismaClient instance and export it for reuse
import { prisma } from "@/prisma/prismaClient";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  // This allows linking accounts by email which is needed for your pre-created users case
  allowDangerousEmailAccountLinking: true, 
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("SIGN IN CALLBACK TRIGGERED", { user, account });
      
      // Ensure user has an email
      if (!user.email) {
        console.log("Sign-in rejected: User has no email");
        return false;
      }

      // Only allow sign in if the email ends with "@estin.dz"
      if (!user.email.endsWith("@estin.dz")) {
        console.log("Sign-in rejected: Email does not end with @estin.dz");
        return false;
      }
    
      try {
        // Check if a user with this email already exists
        const existingUser = await prisma.user.findFirst({
          where: {
            email: user.email,
          },
        });
    
        console.log("Existing user found:", existingUser);
    
        // Handle existing user case
        if (existingUser) {
          // Only update the user if they're signing in with Google and don't have a googleId yet
          if (account?.provider === "google" && account.providerAccountId) {
            console.log("Updating user with Google ID:", account.providerAccountId);
            
            // Update the user record
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { 
                googleId: account.providerAccountId,
                // Update additional user properties if needed
                image: user.image || existingUser.image,
                name: user.name || existingUser.name,
                emailVerified: new Date(),
              },
            });
            
            // Check if the account link already exists before creating it
            const existingAccount = await prisma.account.findFirst({
              where: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            });
            
            // Only create the account link if it doesn't exist
            if (!existingAccount) {
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  refresh_token: account.refresh_token,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                },
              });
              console.log("Account linked successfully");
            } else {
              console.log("Account link already exists, skipping creation");
            }
          }
          return true;
        }
    
        // Allow new user creation (or restrict it)
        console.log("No existing user found, allowing normal sign-up");
        return true;
      } catch (error) {
        console.error("Error during sign-in process:", error);
        return false;
      }
    },
    async jwt({ token, user, account }) {
      // On initial sign in, persist the user id to the token
      if (user) {
        token.id = user.id;
      }
      
      return token;
    },
    async session({ session, token }) {
      // Pass the user id from token to session for client-side use
      if (session.user && token.id) {
        session.user.id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Enable debug messages in development
  debug: process.env.NODE_ENV === "development",
  // Increase security with proper secret
  secret: process.env.NEXTAUTH_SECRET,
};

// If you're using the App Router (newer Next.js versions):
export const getServerAuthSession = () => getServerSession(authOptions);
