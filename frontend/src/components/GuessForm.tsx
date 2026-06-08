import { useState } from "react";

interface GuessFormProps {
  onSubmit: (text: string) => Promise<void>;
  disabled?: boolean;
}

export function GuessForm({ onSubmit, disabled = false }: GuessFormProps) {
  const [guessText, setGuessText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = guessText.trim();

    if (!trimmed) {
      setError("Guess cannot be empty");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(trimmed);
      setGuessText("");
    } catch {
      setError("Failed to submit guess");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="form__field">
        <input
          className="form__input"
          value={guessText}
          onChange={(event) => {
            setGuessText(event.target.value);
            if (error) setError(null);
          }}
          placeholder="Type your guess here..."
          disabled={disabled || isSubmitting}
        />
        {error && <span className="form__error">{error}</span>}
      </label>
      <div className="button-row button-row--compact">
        <button
          className="button button--primary"
          type="submit"
          disabled={disabled || isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit Guess"}
        </button>
      </div>
    </form>
  );
}
