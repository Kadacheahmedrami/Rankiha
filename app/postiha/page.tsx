import AppLayout from "@/components/app-layout";
import ImageFeed from "@/components/postiha/image-feed";

export default function Home() {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col gap-3 mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight glow-text bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
            Image Feed
          </h1>
        </div>
        <ImageFeed />
      </div>
    </AppLayout>
  );
}
