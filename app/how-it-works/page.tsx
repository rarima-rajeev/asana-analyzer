import Image from "next/image";

export const metadata = { title: "How it works · Asana Analyzer" };

export default function HowItWorks() {
  return (
    <>
      <div className="hero">
        <div>
          <h1>How it works</h1>
          <p className="lead">
            Most of the work happens on your own phone or laptop. Only a few numbers go to the cloud.
          </p>
        </div>
        <Image
          src="/images/device.webp"
          alt="Illustration of a phone on a yoga mat showing a stick figure and speaking a tip"
          width={1200}
          height={900}
          priority
        />
      </div>

      <div className="flow" role="img" aria-label="Diagram: video is analyzed on your device; only numbers go to Gemini, which sends back a tip that your device speaks.">
        <div className="zone device">
          <h3>On your device</h3>
          <div className="box"><b>1. The video</b>Analyzed right here. Never uploaded.</div>
          <div className="box"><b>2. Find body points</b>Google&apos;s MediaPipe Pose marks 33 points, like elbows and knees.</div>
          <div className="box"><b>3. Measure and score</b>Simple rules check angles, like &quot;Is the knee bent?&quot;</div>
          <div className="box"><b>5. Say the tip out loud</b>Uses your browser&apos;s built-in voice.</div>
        </div>
        <div className="arrow">
          <span className="big">⇄</span>
          only a few numbers go out; one short tip comes back
        </div>
        <div className="zone cloud">
          <h3>In the cloud</h3>
          <div className="box"><b>4. Write a friendly tip</b>Google Gemini turns the numbers into one plain sentence.</div>
          <div className="box">If Gemini is slow, down, or its tip fails a safety check, a ready-made tip is used instead.</div>
        </div>
      </div>

      <h2>Why split it this way</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Step</th><th>Where it runs</th><th>Why</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Finding body points</td>
              <td>Your device</td>
              <td><b>Privacy:</b> your video never leaves you. <b>Speed:</b> no upload wait. <b>Cost:</b> free, no matter how many people use it.</td>
            </tr>
            <tr>
              <td>Scoring</td>
              <td>Your device</td>
              <td>Plain rules, so every score can be explained. An AI model guessing a score would be harder to trust.</td>
            </tr>
            <tr>
              <td>Writing the tip</td>
              <td>Gemini (cloud)</td>
              <td>Good at friendly, natural wording. It only sees numbers, so each tip costs a tiny fraction of a cent.</td>
            </tr>
            <tr>
              <td>Speaking the tip</td>
              <td>Your device</td>
              <td>Free and instant, with no audio files to download. You can keep your eyes on the pose, not the screen.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>What &quot;multimodal&quot; means here</h2>
      <p>
        Multimodal means the product works across different kinds of input and output, not just text.
        Here: <b>video in</b> → <b>numbers</b> → <b>text</b> → <b>voice out</b>.
      </p>
    </>
  );
}
