export function InlineError({ message }: { message: string }) {
  return (
    <p className="inline-error" role="alert">
      {message}
    </p>
  );
}
