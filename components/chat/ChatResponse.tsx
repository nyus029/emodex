type ChatResponseProps = {
  output: string;
  title?: string;
};

export default function ChatResponse({
  output,
  title = 'Response',
}: ChatResponseProps) {
  return (
    <section className="rounded border border-zinc-300 p-4">
      <h2 className="mb-2 font-semibold">{title}</h2>
      <pre className="whitespace-pre-wrap text-sm">
        {output || '（ここにストリーム結果が表示されます）'}
      </pre>
    </section>
  );
}
