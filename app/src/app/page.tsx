'use client';

import { Footer } from '@/components/app/footer';
import { Header } from '@/components/app/header';
import { Main } from '@/components/app/main';

const Page = () => {
  return (
    <main className="flex flex-col bg-background min-h-screen text-foreground">
      <Header />

      <Main />

      <div className="mt-20">
        <Footer />
      </div>
    </main>
  );
};

export default Page;
