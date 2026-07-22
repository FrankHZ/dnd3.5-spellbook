import { createRoot } from "react-dom/client";
import type { PhbReviewQueueSummary } from "data-tools/phb-review";

const knownQueues: readonly PhbReviewQueueSummary["queueId"][] = [
  "mineru-layout",
  "english-residual",
];

function ShellPlaceholder() {
  return (
    <main>
      <h1>PHB Review Console</h1>
      <p>The review interface will be added in Slice 3.</p>
      <p>Supported queues: {knownQueues.join(", ")}.</p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<ShellPlaceholder />);
