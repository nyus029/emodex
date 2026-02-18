import { FormEvent } from 'react';

type ChatFormProps = {
  value: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
};

export default function ChatForm({
  value,
  isLoading,
  onChange,
  onSubmit,
}: ChatFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-28 rounded border border-zinc-300 p-3"
      />
      <button
        type="submit"
        disabled={isLoading}
        className="w-fit rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {isLoading ? 'Streaming...' : 'Send'}
      </button>
    </form>
  );
}
