"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface Question {
  id: string;
  prompt: string;
  choices: string[];
  citation: string;
}

interface Scenario {
  id: string;
  title: string;
  steps: string[];
}

export default function TrainingPage() {
  const { workspaceId } = useActiveWorkspace();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [quiz, setQuiz] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    void fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "training_home", workspaceId }),
    })
      .then((response) => response.json())
      .then((body: { scenarios?: Scenario[]; quiz?: Question[]; progress?: { passedAt?: string | null } }) => {
        setScenarios(body.scenarios ?? []);
        setQuiz(body.quiz ?? []);
        setAnswers((body.quiz ?? []).map(() => -1));
        setPassed(Boolean(body.progress?.passedAt));
      })
      .catch(() => undefined);
  }, [workspaceId]);

  async function post(payload: Record<string, unknown>) {
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, ...payload }),
    });
    const body = (await response.json()) as { error?: string; created?: number; passedAt?: string | null; score?: number };
    setNotice(body.error ?? (body.score === undefined ? `Seeded ${body.created ?? 0} demo accounts.` : `Score ${body.score} of 5.`));
    if (body.passedAt) setPassed(true);
  }

  return (
    <div>
      <PageHeader eyebrow="Training" title="Demo mode" subtitle="Accounts use the name Example and the DEMO- prefix. Nothing here is a live consumer. A collector or manager needs four correct answers before a live dial is allowed. Admins can still test the adapter." />
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => void post({ op: "training_seed" })}>Load fake accounts</Button>
        {passed ? <Badge tone="good">Quiz passed</Badge> : <Badge tone="warn">Live seat locked</Badge>}
      </div>
      <div className="mb-4 grid gap-3">
        {scenarios.map((scenario) => (
          <Card key={scenario.id} className="p-4 text-sm">
            <div className="font-semibold">{scenario.title}</div>
            <ol className="mt-2 list-decimal pl-5">
              {scenario.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </Card>
        ))}
      </div>
      <Card className="grid gap-4 p-4 text-sm">
        {quiz.map((question, index) => (
          <fieldset key={question.id} className="grid gap-2">
            <legend className="font-semibold">{question.prompt}</legend>
            {question.choices.map((choice, choiceIndex) => (
              <label key={choice} className="flex min-h-11 items-center gap-2">
                <input type="radio" name={question.id} checked={answers[index] === choiceIndex} onChange={() => setAnswers(answers.map((value, item) => item === index ? choiceIndex : value))} />
                {choice}
              </label>
            ))}
            <p className="text-muted-foreground">{question.citation}</p>
          </fieldset>
        ))}
        <Button onClick={() => void post({ op: "training_score", answers })}>Submit quiz</Button>
      </Card>
    </div>
  );
}
