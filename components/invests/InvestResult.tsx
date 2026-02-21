type InvestResultProps = {
  message: string;
  isError?: boolean;
};

export default function InvestResult({ message, isError }: InvestResultProps) {
  if (!message) return null;

  return (
    <p className={`text-sm ${isError ? 'text-red-600' : 'text-gray-700'}`}>
      {message}
    </p>
  );
}
