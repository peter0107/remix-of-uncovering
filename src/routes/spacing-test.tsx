import { createFileRoute } from "@tanstack/react-router";
import { RichTextContent } from "@/components/RichTextEditor";

export const Route = createFileRoute("/spacing-test")({
  head: () => ({ meta: [{ title: "Spacing test — Beginner" }] }),
  component: () => (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-xl font-bold">Spacing test</h1>
      <div className="space-y-8">
        <div>
          <p className="text-sm text-zinc-500">compact mode</p>
          <div className="rounded-md border p-4">
            <RichTextContent
              compact
              value={sampleMarkdown}
              className="prose prose-sm prose-zinc max-w-none"
            />
          </div>
        </div>
        <div>
          <p className="text-sm text-zinc-500">normal mode</p>
          <div className="rounded-md border p-4">
            <RichTextContent
              value={sampleMarkdown}
              className="prose prose-sm prose-zinc max-w-none"
            />
          </div>
        </div>
      </div>
    </div>
  ),
});

const sampleMarkdown = `
제공 자료

| 항목 | 값 |
|------|-----|
| 매출 | 1000 |
| 비용 | 500 |

다음 텍스트입니다.

제공 이미지

![chart](https://placehold.co/600x200)

더 많은 텍스트입니다.
`;
