import TryIt from "@/components/TryIt";

export default function Home() {
  return (
    <>
      <h1>Am I doing this pose correctly?</h1>
      <p className="lead">
        Pick a yoga pose and play a sample video. You&apos;ll see a stick figure, a score, and hear one tip.
      </p>
      <TryIt />
    </>
  );
}
