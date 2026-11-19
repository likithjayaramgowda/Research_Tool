"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { answer, gapCheck, papers } from "@/lib/fixtures";
import { Answer } from "./answer";
import { EmptyState } from "./empty-state";
import { GapGrid } from "./gap-grid";
import { PaperCard } from "./paper-card";

/** The middle pane: ask a question, read paper cards, check for gaps. */
export function ConversationPane() {
  return (
    <Tabs defaultValue="answers" className="gap-6">
      <TabsList>
        <TabsTrigger value="answers">Answers</TabsTrigger>
        <TabsTrigger value="cards">Paper cards</TabsTrigger>
        <TabsTrigger value="gaps">Gaps</TabsTrigger>
      </TabsList>

      <TabsContent value="answers" className="flex flex-col gap-6">
        <form
          className="flex flex-col items-start gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            toast("TODO(copy): Asking questions arrives in a later slice.");
          }}
        >
          <label htmlFor="question" className="text-sm font-semibold">
            Ask your papers
          </label>
          <Textarea
            id="question"
            placeholder="TODO(copy): For example, does irregular sleep affect attention?"
            className="max-w-2xl"
          />
          <Button type="submit">Ask</Button>
        </form>
        <Answer answer={answer} />
      </TabsContent>

      <TabsContent value="cards" className="flex flex-col gap-6">
        {papers.map((paper) => (
          <PaperCard key={paper.id} paper={paper} />
        ))}
      </TabsContent>

      <TabsContent value="gaps" className="flex flex-col gap-4">
        <h2 className="text-lg">Gap Check</h2>
        <GapGrid data={gapCheck} />
        <EmptyState
          title="TODO(copy): Check your own idea."
          description="TODO(copy): Describe your idea and LitLens will check it against your papers."
        />
      </TabsContent>
    </Tabs>
  );
}
