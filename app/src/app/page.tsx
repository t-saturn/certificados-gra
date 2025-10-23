import Image from "next/image";

export default function Home() {
  return (
    <div className="flex justify-center items-center bg-zinc-50 dark:bg-black min-h-screen font-sans">
      <div className="flex flex-col justify-center items-center gap-4">
        <Image src="/img/logo.png" alt="Logo Certificados" width={128} height={128} />
        <h1 className="font-bold text-zinc-900 dark:text-zinc-100 text-4xl">Certificados</h1>
      </div>
    </div>
  );
}
