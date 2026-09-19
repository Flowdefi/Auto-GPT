"use client";

import { useState } from "react";
import { Badge, Button, Card, Title } from "@/components/ui";
import { accountName, pct, when } from "@/lib/format";
import { useCove } from "@/lib/store";
import type { FindingSeverity } from "@/lib/types";

const SEVERITY_TONE: Record<FindingSeverity, "coral" | "sand" | "teal"> = {
  critical: "coral",
  major: "sand",
  minor: "teal",
};

const SAMPLE = `agent: Is this Marcus? Listen, you have to pay today or this gets worse.
consumer: Who is this?
agent: We can keep calling until this is resolved. We will garnish your wages.
consumer: Don't talk to me like that.
agent: Then stop being a deadbeat about it.`;

/**
 * Browser speech synthesis stands in for the production TTS voice. Same script,
 * so what a collector hears in the demo is what the bot would read back.
 */
function speak(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.02;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

export default function QaPage() {
  const reviews = useCove((state) => state.reviews);
  const accounts = useCove((state) => state.accounts);
  const agents = useCove((state) => state.agents);
  const acknowledgeReview = useCove((state) => state.acknowledgeReview);
  const reviewTranscriptNow = useCove((state) => state.reviewTranscriptNow);
  const [draft, setDraft] = useState(SAMPLE);
  const [target, setTarget] = useState(accounts[0]?.id ?? "");
  const [speaking, setSpeaking] = useState<string | null>(null);

  const failing = reviews.filter((review) => review.verdict === "fail").length;
  const unacked = reviews.filter((review) => !review.acknowledged).length;
  const average = reviews.length
    ? Math.round(reviews.reduce((sum, review) => sum + review.score, 0) / reviews.length)
    : 100;

  return (
    <div>
      <Title
        kicker="Compliance QA"
        title="TTS review bot"
        sub="Every call is scored against FDCPA, Reg F, and TCPA rules the moment it ends. The bot reads the coaching back out loud so collectors hear the correction instead of skimming it."
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-cove-sand">Reviewed</div>
          <div className="font-serif text-3xl">{reviews.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-cove-sand">Average score</div>
          <div className={`font-serif text-3xl ${average < 85 ? "text-cove-coral" : "text-cove-sage"}`}>{average}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-cove-sand">Hard failures</div>
          <div className={`font-serif text-3xl ${failing ? "text-cove-coral" : ""}`}>{failing}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-cove-sand">Awaiting acknowledgement</div>
          <div className="font-serif text-3xl">{unacked}</div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {reviews.map((review) => {
            const account = accounts.find((item) => item.id === review.accountId);
            const agent = agents.find((item) => item.id === review.agentId);
            return (
              <Card key={review.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">
                      {agent?.name ?? review.agentId} ·{" "}
                      {account ? accountName(account.firstName, account.lastName) : review.accountId}
                    </div>
                    <div className="text-xs text-cove-sand">
                      {when(review.at)} · {review.durationSec}s
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      tone={review.verdict === "fail" ? "coral" : review.verdict === "coach" ? "sand" : "sage"}
                    >
                      {review.verdict} · {review.score}/100
                    </Badge>
                    {review.acknowledged ? <Badge tone="sage">acknowledged</Badge> : null}
                  </div>
                </div>

                {review.findings.length === 0 ? (
                  <p className="mt-3 text-sm text-cove-sage">No findings. All required disclosures present.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {review.findings.map((finding, index) => (
                      <li key={index} className="rounded-2xl border border-parchment-200 p-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={SEVERITY_TONE[finding.severity]}>{finding.severity}</Badge>
                          <span className="font-semibold">{finding.rule}</span>
                        </div>
                        <p className="mt-1 text-cove-mute">{finding.detail}</p>
                        {finding.quote ? (
                          <p className="mt-1 border-l-2 border-cove-coral pl-3 italic text-cove-mute">
                            &ldquo;{finding.quote}&rdquo;
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 rounded-2xl bg-parchment-100 p-3 text-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-cove-sand">Spoken coaching</div>
                  <p className="mt-1 text-cove-ink">{review.coaching}</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    tone="ghost"
                    className="min-h-9 text-xs"
                    onClick={() => {
                      speak(review.coaching);
                      setSpeaking(review.id);
                    }}
                  >
                    {speaking === review.id ? "Playing…" : "Play coaching (TTS)"}
                  </Button>
                  {!review.acknowledged ? (
                    <Button className="min-h-9 text-xs" onClick={() => acknowledgeReview(review.id)}>
                      Acknowledge
                    </Button>
                  ) : null}
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-cove-mute">Transcript</summary>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-cove-mute">{review.transcript}</pre>
                </details>
              </Card>
            );
          })}
          {reviews.length === 0 ? (
            <Card className="p-5 text-sm text-cove-mute">
              No reviews yet. End a call on the Live screen and it lands here automatically.
            </Card>
          ) : null}
        </div>

        <div className="space-y-3">
          <Card className="p-4">
            <div className="font-semibold">Score a transcript</div>
            <p className="mt-1 text-xs text-cove-mute">
              Paste anything — a recording transcript, a draft script, a new hire&apos;s role play.
            </p>
            <select
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-2xl border border-parchment-200 bg-parchment-50 px-3 text-sm"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {accountName(account.firstName, account.lastName)} · {account.state}
                </option>
              ))}
            </select>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="mt-2 h-40 w-full rounded-2xl border border-parchment-200 bg-parchment-50 p-3 text-xs outline-none focus:ring-2 focus:ring-cove-teal"
            />
            <Button
              className="mt-2 w-full"
              onClick={() => {
                const agentId = agents.find((agent) => agent.role === "Collector")?.id ?? agents[0]?.id;
                if (agentId && target) reviewTranscriptNow(target, agentId, draft);
              }}
            >
              Run review
            </Button>
          </Card>

          <Card className="p-4 text-sm">
            <div className="font-semibold">What the bot checks</div>
            <ul className="mt-2 space-y-1.5 text-cove-mute">
              <li>Mini-Miranda on first contact (FDCPA 807(11)).</li>
              <li>Recording disclosure before substance.</li>
              <li>Right-party verification before any balance is spoken.</li>
              <li>Validation delivered before a payment demand (Reg F 1006.34).</li>
              <li>No arrest, suit, garnishment, or lien language (807(4), 807(5)).</li>
              <li>No third-party disclosure (805(b)).</li>
              <li>No abusive language (806(2)).</li>
              <li>No call-frequency pressure (Reg F 1006.14(b)).</li>
              <li>Cease-and-desist honored.</li>
            </ul>
            <p className="mt-3 text-xs text-cove-sand">
              Critical findings are an automatic fail regardless of score. Scores weight critical at 40 points, major
              at 15, minor at 5.
            </p>
          </Card>

          <Card className="p-4 text-sm">
            <div className="font-semibold">Agent standing</div>
            {agents
              .filter((agent) => agent.role === "Collector")
              .map((agent) => (
                <div key={agent.id} className="mt-2 flex items-center justify-between">
                  <span>{agent.name}</span>
                  <span className={agent.qaScore < 85 ? "text-cove-coral" : "text-cove-sage"}>
                    {agent.qaScore} · {pct(agent.qaScore / 100, 0)}
                  </span>
                </div>
              ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
