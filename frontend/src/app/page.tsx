import { About } from "@/components/sections/About";
import { CallToAction } from "@/components/sections/CallToAction";
import { Contact } from "@/components/sections/Contact";
import { Differentials } from "@/components/sections/Differentials";
import { Hero } from "@/components/sections/Hero";
import { Segments } from "@/components/sections/Segments";
import { Structure } from "@/components/sections/Structure";

export default function Home() {
  return (
    <main id="conteudo">
      <Hero />
      <About />
      <Segments />
      <Differentials />
      <Structure />
      <CallToAction />
      <Contact />
    </main>
  );
}
