const Voice = (() => {
  const supported = 'speechSynthesis' in window;
  const recognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

  let recognition = null;
  let isSpeaking = false;

  function speak(text, options = {}) {
    if (!text || !supported) return null;

    const utterance = new SpeechSynthesisUtterance(text);
    const {
      lang = 'de-DE', // Auf Deutsch geändert
      rate = 1,
      pitch = 0.95,   // Etwas tiefere, entspanntere Stimme für Niko
      volume = 1,
      voice = null,
      onstart = null,
      onend = null,
      onerror = null,
    } = options;

    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    // Automatisch eine gute deutsche Stimme wählen, falls keine übergeben wurde
    if (voice) {
      utterance.voice = voice;
    } else {
      const voices = window.speechSynthesis.getVoices();
      const germanVoice = voices.find(v => v.lang.includes('de') && v.name.includes('Google')) 
                       || voices.find(v => v.lang.includes('de'));
      if (germanVoice) utterance.voice = germanVoice;
    }

    utterance.onstart = () => {
      isSpeaking = true;
      if (typeof onstart === 'function') onstart();
    };

    utterance.onend = () => {
      isSpeaking = false;
      if (typeof onend === 'function') onend();
    };

    utterance.onerror = (event) => {
      isSpeaking = false;
      if (typeof onerror === 'function') onerror(event);
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);

    return utterance;
  }

  function stopSpeaking() {
    if (supported) {
      window.speechSynthesis.cancel();
      isSpeaking = false;
    }
  }

  function getVoices() {
    return typeof window.speechSynthesis !== 'undefined'
      ? window.speechSynthesis.getVoices()
      : [];
  }

  function startListening({
    language = 'de-DE', // Auf Deutsch geändert
    continuous = false,
    interimResults = false,
    onResult = null,
    onError = null,
    onStart = null,
    onEnd = null,
  } = {}) {
    if (!recognitionCtor) {
      if (typeof onError === 'function') {
        onError(new Error('Spracherkennung wird in diesem Browser nicht unterstützt.'));
      }
      return null;
    }

    recognition = new recognitionCtor();
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;

    recognition.onstart = () => {
      if (typeof onStart === 'function') onStart();
    };

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }

      if (typeof onResult === 'function') {
        onResult({
          transcript,
          results: event.results,
          isFinal: event.results[event.results.length - 1].isFinal,
        });
      }
    };

    recognition.onerror = (event) => {
      if (typeof onError === 'function') onError(event.error || event);
    };

    recognition.onend = () => {
      if (typeof onEnd === 'function') onEnd();
    };

    recognition.start();
    return recognition;
  }

  function stopListening() {
    if (recognition && typeof recognition.stop === 'function') {
      recognition.stop();
    }
  }

  return {
    supported,
    isSpeaking,
    speak,
    stopSpeaking,
    getVoices,
    startListening,
    stopListening,
  };
})();

// Macht 'voice' im gesamten Browser verfügbar
if (typeof window !== 'undefined') {
  window.voice = Voice;
}