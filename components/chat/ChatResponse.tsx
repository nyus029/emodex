type ChatResponseProps = {
  output: string;
};

export default function ChatResponse({ output }: ChatResponseProps) {
  return (
    <section className="rounded border border-zinc-300 p-4">
      <h2 className="mb-2 font-semibold">Response</h2>
      <pre className="whitespace-pre-wrap text-sm">
        {output || '（ここにストリーム結果が表示されます）'}
      </pre>
    </section>
  );
}
