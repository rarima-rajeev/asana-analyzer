import Image from "next/image";
import TryIt from "@/components/TryIt";

export default function Home() {
  return (
    <>
      <div className="hero">
        <div>
          <h1>Am I doing this pose correctly?</h1>
          <p className="lead">
            Pick a yoga pose and play a sample video. You&apos;ll see a stick figure, a score, and hear one tip.
          </p>
        </div>
        <Image
          src="/images/hero.webp"
          alt="Illustration of a person in a yoga pose with a stick figure traced over their body"
          width={1200}
          height={900}
          priority
        />
      </div>
      <TryIt />
    </>
  );
}
