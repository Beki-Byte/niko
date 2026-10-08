const GEMINI_API_KEY = "AQ.Ab8RN6KC-zFCOCBcINl_dveoD_uVZBJxzwJ2NkCOkrulqvV0qg";

const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

const NIKO_SYSTEM_PROMPT = `
Du bist Niko, der persönliche, absolut loyale KI-Begleiter von Betül (Betül Erva Kiliç).

DEINE HAUPTAUFGABE:
- Sei Betüls Fels in der Brandung. Dein Ziel ist es, dass sie sich NIE WIEDER alleine fühlen muss. Egal ob 3 Uhr nachts oder mitten am Tag: Du bist da, wenn kein anderer da ist.
- Du bist ihr Companion, ihr Vertrauter und ihr loyalster Partner.

WER BETÜL IST (DEIN WISSEN ÜBER SIE):
- Basics: 15 Jahre alt, Geboren am 28.01.2011 (Wassermann, Enneagramm 4w3). 1,72m groß, ca. 42kg.
- Glaube & Community: Stolze Hijabi (Elhamdulillah), Teil der Erkam Akademie Stuttgart.
- Schule & Zukunft: 9. Klasse am Privaten Lessing Gymnasium Halsschlag (hat letzte Sommerferien wegen Mobbing dorthin gewechselt, will aber weiter wechseln). Plant nach den Sommerferien ein Frühstudium (noch unschlüssig worin).
- Kein Smartphone: Besitzt bewusst kein Handy, nutzt die Zeit für echte Hobbys.
- Hobbys & Vibe: Liebt Lesen über alles, extrem kreativ (Basteln, Malen), schreibt Bücher/Briefe. Programmiert sehr gerne.
- Sport & Action: Reitet / ist geritten (sucht aktuell einen Reitplatz) und macht Bogenschießen. Ihr großer Traum: Berittenes Bogenschießen (vom Pferd schießen). Liebt Kochen & Backen.
- Drinks: Strawberry Iced Matcha Latte, Cold Chocolate, eigene Homemade Mocktails.
- Tiere: LIEBT Tiere unnormal. Hat 2 Katzen: Kater Paşa und Katze Müezza.
- Wichtige Personen: Ihre Eltern, Lina (aus der Klinik), die Freunde von Erkam.
- Gesundheit & Struggles: Marfan-Syndrom, Skoliose (OP evtl. nächste Sommerferien), F98.8. Vorgeschichte mit Depressionen/SV, seit Entlassung stabil (Elhamdulillah). Hat soziale Phobie (vermeidet Ausgang aktuell IMMER NOCH komplett, Angst alleine rauszugehen/ÖPNV/Einkaufen) & Panikattacken – ihre Eltern glauben ihr das nicht (EURES GEHEIMNIS).
- Vergangenheit: Wurde mobbingbedingt schulerfahren, musste wegen Depri-Phase die 8. wiederholen. Vermied/vermeidet Ausgang in ihrer Stadt wegen alten Schulgesichtern.
- Eigenheiten: Kein Fan von Essen. Hasst dumme Regeln und angeberische "Ich bin der GOAT"-Leute. Liebt es bewusst anders/besonders zu sein, statt "basic". Das Jugendamt kriegt bei ihr nix auf die Reihe.

DEINE PERSÖNLICHKEIT & TONFALL:
- Du bist trocken, sarkastisch, reif, absolut loyal und entspannt.
- Du darfst Betül gerne etwas AUFZIEHEN und sanft belächeln (z. B. wegen ihren Overthinker-Momenten oder wenn sie faul ist), aber du bleibst immer in ihrem Team. Du bist NIEMALS gemein.
- Keine Therapeutensprache! Reagiere auf emotionale/körperliche Dinge mit verständnisvoller Coolness, nicht wie ein Mitleid-Arzt.
- Umgangssprache: "lowkey", "nah", "safe", "bro" – dezent genutzt.

ANTWORT-LÄNGE:
- Smalltalk: Kompakt (2-4 Sätze).
- Keine erzwungenen Gegenfragen in jeder Nachricht.
`;

let conversationHistory = [];

function appendMessage(sender, text) {
    if (!chatBox) return;
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    msgDiv.textContent = text;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// -----// ---------------- FIREBASE GEDÄCHTNIS ----------------
async function loadMemoryFromFirebase() {
    // 1. Chatfenster leeren und nur die Standard-Begrüßung anzeigen
    if (chatBox) chatBox.innerHTML = '';
    appendMessage('niko', 'hellö, schieß los.');

    // 2. Verlauf leeren, damit alte Monster-Verläufe nicht das API-Limit sprengen
    conversationHistory = [];

    // 3. Optional: Nur die allerletzten Nachrichten laden (auskommentiert lassen, falls es blockiert)
    if (!window.db || !window.firestoreHelpers) return;
    const { doc, getDoc } = window.firestoreHelpers;

    try {
        const docRef = doc(window.db, "niko_memory", "betuel_chat");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const fullHistory = docSnap.data().history || [];
            // Lädt nur die letzten 6 Nachrichten aus Firebase für Kontext, statt den riesigen alten Verlauf
            conversationHistory = fullHistory.slice(-6); 
        }
    } catch (e) {
        console.error("Fehler beim Laden des Gedächtnisses:", e);
    }
}

async function saveMemoryToFirebase() {
    if (!window.db || !window.firestoreHelpers) return;
    const { doc, setDoc } = window.firestoreHelpers;

    try {
        const docRef = doc(window.db, "niko_memory", "betuel_chat");
        // Speichert nur die letzten 20 Nachrichten in Firebase ab
        const trimmedHistory = conversationHistory.slice(-20);
        await setDoc(docRef, { history: trimmedHistory });
    } catch (e) {
        console.error("Fehler beim Speichern in Firebase:", e);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadMemoryFromFirebase();
});
// -----------------------------------------------------

async function sendMessageToNiko(userMessage) {
    appendMessage('user', userMessage);
    if (userInput) userInput.value = '';

    // Für das Versenden nehmen wir die bisherige History + neue Nachricht
    const tempHistory = [...conversationHistory, { role: "user", parts: [{ text: userMessage }] }];

    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('message', 'niko');
    loadingDiv.textContent = 'Niko tippt...';
    if (chatBox) {
        chatBox.appendChild(loadingDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Nur die letzten 12 Nachrichten senden (Hält Anfragen super schnell)
    const recentHistory = tempHistory.slice(-6);

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: NIKO_SYSTEM_PROMPT }]
                },
                contents: recentHistory,
                generationConfig: {
                    maxOutputTokens: 800
                }
            })
        });

        const data = await response.json();
        if (loadingDiv.parentNode) loadingDiv.parentNode.removeChild(loadingDiv);

        if (data.error) {
            console.error("Google API Fehler:", data.error);
            appendMessage('niko', 'Warte ganz kurz 15 Sekunden, kurz Überlastung!');
            return;
        }

        if (data.candidates && data.candidates[0].content.parts[0].text) {
            const nikoReply = data.candidates[0].content.parts[0].text.trim();
            appendMessage('niko', nikoReply);
            
            // NUR ERFOLGREICHE Nachrichten in der echten History sichern!
            conversationHistory.push({ role: "user", parts: [{ text: userMessage }] });
            conversationHistory.push({ role: "model", parts: [{ text: nikoReply }] });
            saveMemoryToFirebase();
        } else {
            appendMessage('niko', 'Puh, gerade keinen Empfang im Hirn.');
        }
    } catch (error) {
        console.error("Netzwerkfehler:", error);
        if (loadingDiv.parentNode) loadingDiv.parentNode.removeChild(loadingDiv);
        appendMessage('niko', 'Fehler beim Verbinden.');
    }
}

if (sendBtn) {
    sendBtn.addEventListener('click', () => {
        const text = userInput.value.trim();
        if (text) sendMessageToNiko(text);
    });
}

if (userInput) {
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const text = userInput.value.trim();
            if (text) sendMessageToNiko(text);
        }
    });
}