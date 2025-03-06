// File: lib/auth.ts

import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { NextAuthOptions, getServerSession } from "next-auth";
import { DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Extend the NextAuthOptions interface to include allowDangerousEmailAccountLinking
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

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  allowDangerousEmailAccountLinking: true, // Now allowed via the augmented type
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) {
        return false;
      }

      // Check if a user with this email already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          email: user.email,
        },
      });

      if (existingUser) {
        // If the user exists but doesn't have a googleId yet, update it
        if (account?.provider === "google" && !existingUser.googleId && account.providerAccountId) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { googleId: account.providerAccountId },
          });
        }
        return true;
      }

      // If you want to prevent new sign-ups and only allow pre-existing users:
      // Uncomment the next line to restrict logins to existing users only.
      // return false;

      return true;
    },
    async jwt({ token, user }) {
      // On initial sign in, persist the user id to the token.
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Pass the user id from token to session.
      if (session.user) {
        session.user.id = token.id as string;
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
  },
};

export const getServerAuthSession = () => getServerSession(authOptions);
