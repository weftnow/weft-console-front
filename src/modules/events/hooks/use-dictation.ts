"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Minimal shape of the browser Speech Recognition API. It is not in lib.dom,
 * and Chrome still exposes it under the webkit prefix.
 */
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: SpeechResultEventLike) => void) | null;
  abort: () => void;
  start: () => void;
  stop: () => void;
}

interface SpeechResultEventLike {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const candidate = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

const ERROR_MESSAGES: Record<string, string> = {
  "audio-capture": "No microphone was found on this device.",
  "no-speech": "Nothing was picked up. Try again.",
  "not-allowed": "Microphone access was blocked for this site.",
  "service-not-allowed": "Microphone access was blocked for this site.",
};

/**
 * Dictation for a text field. Final transcripts are handed to `onTranscript`,
 * which appends them to the draft. Nothing is sent anywhere by this app; the
 * browser owns the recognition.
 */
export function useDictation(onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef(onTranscript);
  const supported = getRecognitionConstructor() !== null;

  useEffect(() => {
    transcriptRef.current = onTranscript;
  }, [onTranscript]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Recognition = getRecognitionConstructor();
    if (!Recognition || recognitionRef.current) return;

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = document.documentElement.lang || "en-US";

    recognition.onresult = (event) => {
      let captured = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) captured += result[0].transcript;
      }
      const trimmed = captured.trim();
      if (trimmed) transcriptRef.current(trimmed);
    };
    recognition.onerror = (event) => {
      setError(ERROR_MESSAGES[event.error ?? ""] ?? "Dictation stopped unexpectedly.");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };

    setError("");
    try {
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
    } catch {
      setError("Dictation could not be started.");
    }
  }, []);

  useEffect(() => () => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
  }, []);

  return { error, listening, start, stop, supported };
}
