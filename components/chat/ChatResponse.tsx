type ChatResponseProps = {
  output: string;
  title?: string;
};

export default function ChatResponse({
  output,
  title = 'Response',
}: ChatResponseProps) {
  return (
    <section>
      <h2 className="mb-2 text-[13px] font-medium text-gray-900">{title}</h2>
      <pre className="whitespace-pre-wrap text-[13px] text-gray-700">
        {output || '（ここにストリーム結果が表示されます）'}
      </pre>
    </section>
  );
}
