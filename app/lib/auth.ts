import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions, getServerSession } from "next-auth";
import { DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/prisma/prismaClient";
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist";
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


export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
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
      
      if (!user.email) {
        console.log("Sign-in rejected: User has no email");
        return false;
      }

      if (BLACKLISTED_EMAILS.includes(user.email)) {
        console.log(`Sign-in rejected: ${user.email} is blacklisted`);
        return false;
      }

      if (!user.email.endsWith("@estin.dz")) {
        console.log("Sign-in rejected: Email does not end with @estin.dz");
        return false;
      }
    
      try {
        const existingUser = await prisma.user.findFirst({
          where: { email: user.email },
        });
    
        console.log("Existing user found:", existingUser);
    
        if (existingUser) {
          if (account?.provider === "google" && account.providerAccountId) {
            console.log("Updating user with Google ID:", account.providerAccountId);
            
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { 
                googleId: account.providerAccountId,
                image: user.image || existingUser.image,
                name: user.name || existingUser.name,
                emailVerified: new Date(),
                visible: true,
              },
            }); 
            
            const existingAccount = await prisma.account.findFirst({
              where: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            });
            
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
    
        // Create new user with visible set to true instead of using default adapter behavior
        console.log("No existing user found, creating new user with visible=true");
        
        // Manually create the user
        await prisma.user.create({
          data: {
            email: user.email,
            name: user.name,
            image: user.image,
            emailVerified: new Date(),
            visible: true,
            googleId: account?.providerAccountId,
            accounts: account?.provider ? {
              create: {
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                ...(account.refresh_token ? { refresh_token: account.refresh_token } : {}),
                ...(account.access_token ? { access_token: account.access_token } : {}),
                ...(account.expires_at ? { expires_at: account.expires_at } : {}),
                ...(account.token_type ? { token_type: account.token_type } : {}),
                ...(account.scope ? { scope: account.scope } : {}),
                ...(account.id_token ? { id_token: account.id_token } : {})
              }
            } : undefined
          }
        });
        
        return true;
      } catch (error) {
        console.error("Error during sign-in process:", error);
        return false;
      }
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
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
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
};

export const getServerAuthSession = () => getServerSession(authOptions);