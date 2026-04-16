import { createFileRoute } from "@tanstack/react-router";
import { ClassifierApp } from "@/components/ClassifierApp";
import heroBg from "@/assets/hero-bg.jpg";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "SignAI — Clasificador de Señales de Tráfico" },
      {
        name: "description",
        content:
          "Sube una imagen de una señal de tráfico y nuestra IA la clasificará al instante.",
      },
    ],
  }),
});

function Index() {
  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <img
          src={heroBg}
          alt=""
          className="w-full h-full object-cover opacity-20"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/95 to-background" />
      </div>

      {/* Header */}
      <header className="pt-12 pb-8 px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          IA de Clasificación
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          <span className="gradient-text">SignAI</span>
        </h1>
        <p className="mt-3 text-muted-foreground max-w-md mx-auto text-base">
          Sube una foto de una señal de tráfico y obtén su clasificación al
          instante con inteligencia artificial.
        </p>
      </header>

      {/* Main */}
      <main className="px-6 pb-16">
        <ClassifierApp />
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 inset-x-0 py-4 text-center text-muted-foreground/40 text-xs">
        Powered by AI • SignAI
      </footer>
    </div>
  );
}
