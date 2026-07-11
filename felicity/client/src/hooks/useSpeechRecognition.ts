import { useCallback, useEffect, useRef, useState } from "react";

// The Web Speech API has no official TS lib entry; the shapes we touch
// are narrow enough that `any` is simpler than hand-rolling types for an
// API surface that varies between Chrome/Safari/webkit prefixes anyway.
type SpeechRecognitionInstance = any;

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
}

export function useSpeechRecognition() {
  const [isSupported] = useState(() => getSpeechRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTextRef = useRef("");
  const shouldBeListeningRef = useRef(false);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError("Voice input isn't supported in this browser.");
      return;
    }

    finalTextRef.current = "";
    setFinalText("");
    setInterimText("");
    setError(null);
    shouldBeListeningRef.current = true;

    const recognition: SpeechRecognitionInstance = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTextRef.current += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      setFinalText(finalTextRef.current);
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      setError(`Voice input error: ${event.error}`);
    };

    recognition.onend = () => {
      // Browsers often end a "continuous" session after a silence gap.
      // Restart transparently so it still feels like one open conversation
      // until the user explicitly taps stop.
      if (shouldBeListeningRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          // already starting/started — ignore
        }
      }
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, []);

  const stop = useCallback(() => {
    shouldBeListeningRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  useEffect(() => {
    return () => {
      shouldBeListeningRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  return {
    isSupported,
    listening,
    transcript: finalText.trim(),
    interimText,
    fullTranscript: `${finalText} ${interimText}`.trim(),
    error,
    start,
    stop,
  };
}
