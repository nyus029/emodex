type InvestResultProps = {
  message: string;
  isError?: boolean;
};

export default function InvestResult({ message, isError }: InvestResultProps) {
  if (!message) return null;

  return (
    <p
      className={`text-sm ${isError ? 'text-red-600 dark:text-red-400' : 'text-zinc-700 dark:text-zinc-200'}`}
    >
      {message}
    </p>
  );
}
