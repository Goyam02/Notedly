import React, { useState, useEffect, useRef } from "react"; // Added useEffect
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, MessageSquare, Volume2, BookmarkPlus, HelpCircle, Loader2, AlertCircle, StopCircle, Pause, Play, Ear, Link, Mic, MicOff } from "lucide-react"; // Added Mic icons
import { useToast } from "@/hooks/use-toast"; // Assuming this is Shadcn's useToast
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter, // Maybe useful for close button
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input"; // Use Shadcn Input
import { Textarea } from "@/components/ui/textarea"; // Use Shadcn Textarea for consistency
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Assuming Shadcn Select

// Define types for API responses (optional but good practice)
interface Flashcard {
  question: string;
  answer: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index
}

const LearningHub = () => {
  const { toast } = useToast();
  const [documentUrl, setDocumentUrl] = useState<string>(""); // NEW: Store document URL
  const [isProcessing, setIsProcessing] = useState(false); // NEW: Loading state for document processing
  const [processingError, setProcessingError] = useState<string | null>(null); // NEW: Error state for processing
  const [sessionId, setSessionId] = useState<string | null>(null); // NEW: Session ID for chat

  const [showFeatures, setShowFeatures] = useState(false);

  // Chat State
  const [question, setQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState<{ type: 'user' | 'ai'; content: string }[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false); // NEW: Loading state for chat

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [voiceQuestion, setVoiceQuestion] = useState("");
  const [voiceAnswer, setVoiceAnswer] = useState("");

  // Flashcard State
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });
  const [quizSubmitted, setQuizSubmitted] = useState(false);

// --- NEW Audio State ---
// const AudioSection = () => {
  // --- State Variables ---
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null); // Will hold the Object URL
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tutorExplanationText, setTutorExplanationText] = useState<string>(''); // State to hold the fetched text
  const [error, setError] = useState<string | null>(null); // State for displaying errors

  // --- Refs ---
  const audioRef = useRef<HTMLAudioElement>(null);
// --- End Audio State ---

  // --- Helper function for API calls ---
  const makeApiCall = async (endpoint: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(`/api${endpoint}`, { // Use relative path for proxy
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json(); // Try to parse JSON regardless of status

      if (!response.ok) {
        console.error("API Error Response:", data);
        throw new Error(data.detail || data.error || `HTTP error ${response.status}`);
      }
      return data;
    } catch (error: any) {
      console.error(`API call to ${endpoint} failed:`, error);
      toast({
        title: "API Error",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
      throw error; // Re-throw to be caught by calling function if needed
    }
  };

const FLASK_BACKEND_URL = 'http://127.0.0.1:5555'

  useEffect(() => {
    const fetchExplanation = async () => {
        setError(null); // Clear previous errors
        console.log("Attempting to fetch explanation text...");
        try {
            const response = await fetch(`${FLASK_BACKEND_URL}/api/getTutorExplanation`);
            console.log("Fetch response status:", response.status);

            if (!response.ok) {
                // Try to get error message from response if available
                let errorMsg = `HTTP error! Status: ${response.status}`;
                try {
                    const errData = await response.json(); // Try parsing JSON error
                    errorMsg = errData.error || errorMsg;
                } catch (_) {
                    // If not JSON, try getting text error
                    try {
                       const errText = await response.text();
                       errorMsg = errText || errorMsg;
                    } catch { /* Ignore if response is not text either */ }
                }
                throw new Error(errorMsg);
            }

            const data = await response.text(); // Expecting plain text
            console.log("Fetched explanation text (first 100 chars):", data.substring(0, 100));

            if (!data) {
                throw new Error("Received empty explanation text from server.");
            }
            setTutorExplanationText(data);
        } catch (error: any) {
            console.error("Failed to fetch tutor_explanation.txt:", error);
            setError(`Failed to load explanation: ${error.message}`);
            setTutorExplanationText(''); // Ensure text is empty on error
        }
    };

    fetchExplanation();
}, []);

const handleProcessDocument = async () => {
  if (!documentUrl.trim()) {
    toast({
      title: "Invalid URL",
      description: "Please enter a valid document URL.",
      variant: "destructive",
    });
    return;
  }

  setIsProcessing(true);
  setProcessingError(null);
  setSessionId(null);
  setChatMessages([]);
  setFlashcards([]);
  setQuizQuestions([]);
  setShowFeatures(false);

  try {
    // Call the FastAPI backend to process the document
    const response = await fetch("/api/doc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        documents: documentUrl.trim()
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || `Processing failed with status: ${response.status}`);
    }

    // Generate a session ID for chat
    setSessionId(crypto.randomUUID());

    toast({
      title: "Document Processed Successfully",
      description: "The document is ready. You can now ask questions!",
    });

    setShowFeatures(true);

  } catch (error: any) {
    console.error("Document processing failed:", error);
    setProcessingError(error.message || "An unknown error occurred during processing.");
    toast({
      title: "Processing Failed",
      description: error.message || "Could not process the document.",
      variant: "destructive",
    });
  } finally {
    setIsProcessing(false);
  }
};

  // Handle chat submission - UPDATED for FastAPI backend
  const handleChatSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault(); // Allow calling without event (e.g., from buttons)
    if (!question.trim() || !sessionId || isChatLoading) return;

    const userMessage = question;
    setChatMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setQuestion(""); // Clear input immediately
    setIsChatLoading(true);

    try {
      const data = await fetch("/api/get_response", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          question: userMessage,
          session_id: sessionId
        }),
      });

      const response = await data.json();

      if (!data.ok) {
        throw new Error(response.detail || `Chat failed with status: ${data.status}`);
      }

      setChatMessages(prev => [...prev, { type: 'ai', content: response.answer }]);

    } catch (error: any) {
      console.error("Chat failed:", error);
      toast({
        title: "Chat Error",
        description: error.message || "Could not get response from AI.",
        variant: "destructive",
      });
      setChatMessages(prev => [...prev, { type: 'ai', content: "Sorry, I couldn't get a response. Please try again." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Voice functionality
  const startListening = () => {
    if (!sessionId) {
      toast({
        title: "No Document Loaded",
        description: "Please process a document first before using voice features.",
        variant: "destructive",
      });
      return;
    }

    setIsListening(true);
    setVoiceQuestion("");
    setVoiceAnswer("");

    // Simulate voice recognition (in a real app, you'd use Web Speech API)
    setTimeout(() => {
      const sampleQuestions = [
        "What is the main topic of this document?",
        "Can you summarize the key points?",
        "What are the most important concepts?",
        "Explain the main ideas in simple terms"
      ];
      const randomQuestion = sampleQuestions[Math.floor(Math.random() * sampleQuestions.length)];
      setVoiceQuestion(randomQuestion);
      setIsListening(false);
      handleVoiceQuestion(randomQuestion);
    }, 2000);
  };

  const stopListening = () => {
    setIsListening(false);
  };

  const handleVoiceQuestion = async (question: string) => {
    if (!sessionId) return;

    setIsVoiceLoading(true);
    setVoiceAnswer("");

    try {
      const data = await fetch("/api/voice_response", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          question: question,
          session_id: sessionId
        }),
      });

      const response = await data.json();

      if (!data.ok) {
        throw new Error(response.detail || `Voice response failed with status: ${data.status}`);
      }

      setVoiceAnswer(response.text_answer);
      toast({
        title: "Voice Response Generated",
        description: response.message || "Voice response created successfully.",
      });

    } catch (error: any) {
      console.error("Voice response failed:", error);
      toast({
        title: "Voice Error",
        description: error.message || "Could not generate voice response.",
        variant: "destructive",
      });
    } finally {
      setIsVoiceLoading(false);
    }
  };

// --- Handler Function: Generate Audio by calling Flask /tts endpoint ---
const handleGenerateAudio = async () => {
  if (!tutorExplanationText) {
      setError("Cannot generate audio: Tutor explanation text is not loaded.");
      return;
  }

  setIsGeneratingAudio(true);
  setAudioSrc(null); // Clear previous audio source immediately
  setError(null); // Clear previous errors

  // --- Important: Revoke previous object URL if it exists BEFORE fetching new one ---
  if (audioSrc && audioSrc.startsWith('blob:')) {
      URL.revokeObjectURL(audioSrc);
      // console.log("Revoked previous Object URL:", audioSrc); // For debugging
  }
  // ---

  console.log("Requesting TTS generation from backend...");
  try {
      // Make POST request to the Flask /tts endpoint
      const response = await fetch(`${FLASK_BACKEND_URL}/tts`, {
          method: 'POST',
          // No body is needed since the Flask endpoint reads the file itself
          // headers: { 'Content-Type': 'application/json', }, // Not needed if no body
      });

      console.log("TTS response status:", response.status);

      if (!response.ok) {
          // Try to get error message from response
           let errorMsg = `TTS generation failed: ${response.status}`;
           try {
               const errData = await response.json();
               errorMsg = errData.error || errorMsg;
           } catch (_) {
              try {
                 const errText = await response.text();
                 errorMsg = errText || errorMsg;
              } catch { /* Ignore if response is not text either */ }
           }
           throw new Error(errorMsg);
      }

      // Handle the raw audio data (Blob)
      const audioBlob = await response.blob();
      console.log("Received audio blob, size:", audioBlob.size, "type:", audioBlob.type);

      if (audioBlob.size === 0) {
          throw new Error("Received empty audio data from server.");
      }
      if (audioBlob.type !== 'audio/mpeg') {
          console.warn("Received blob type is not 'audio/mpeg', it is:", audioBlob.type, ". Playback might fail.");
      }

      // Create an Object URL from the Blob
      const objectUrl = URL.createObjectURL(audioBlob);
      console.log("Created Object URL:", objectUrl);
      setAudioSrc(objectUrl); // Set the new audio source

  } catch (error: any) {
      console.error("Error generating or processing audio:", error);
      setError(`Audio generation failed: ${error.message}`);
      setAudioSrc(null); // Ensure no audio source on error
  } finally {
      setIsGeneratingAudio(false);
  }
};
// --- End Generate Audio Handler ---


// --- Audio Player Control Handlers ---
const togglePlayPause = () => {
  const audioElement = audioRef.current;
  if (!audioElement || !audioSrc) return; // Don't do anything if no element or source

  if (isPlaying) {
      audioElement.pause();
  } else {
      audioElement.play().catch(e => {
          console.error("Error playing audio:", e);
          setError("Could not play audio. Interaction might be required.");
          setIsPlaying(false); // Ensure state is correct if play fails
      });
  }
  setIsPlaying(!isPlaying);
};


const handleStop = () => {
  const audioElement = audioRef.current;
  if (!audioElement) return;

  audioElement.pause();
  audioElement.currentTime = 0; // Reset playback position
  setIsPlaying(false);
};



const handleSpeedChange = (speed: string) => {
  const newSpeed = parseFloat(speed);
  setPlaybackSpeed(newSpeed);
  // The effect hook below will handle applying the speed to the audio element
};
// --- End Player Control Handlers ---



 // --- NEW: Effects for Audio Playback ---

//  // Effect to play/pause audio element when isPlaying state changes [10]
//  useEffect(() => {
//      if (audioRef.current) {
//          if (isPlaying) {
//              audioRef.current.play().catch(error => {
//                  console.error("Audio play failed:", error);
//                  setIsPlaying(false); // Reset state if play fails
//                  toast({ title: "Playback Error", description: "Could not play audio.", variant: "destructive" });
//              });
//          } else {
//              audioRef.current.pause();
//          }
//      }
//  }, [isPlaying]);

 // Effect to handle audio ending
//  useEffect(() => {
//      const audioElement = audioRef.current;
//      const handleAudioEnd = () => setIsPlaying(false);

//      if (audioElement) {
//          audioElement.addEventListener('ended', handleAudioEnd);
//          return () => {
//              audioElement.removeEventListener('ended', handleAudioEnd);
//          };
//      }
//  }, []); // Run only once

 // Effect to cleanup Blob URL when component unmounts or src changes [5]
//  useEffect(() => {
//      const currentAudioSrc = audioSrc; // Capture src on effect run
//      return () => {
//          if (currentAudioSrc) {
//              URL.revokeObjectURL(currentAudioSrc);
//              // console.log("Revoked audio URL:", currentAudioSrc);
//          }
//      };
//  }, [audioSrc]);

 // Effect to set initial playback rate when audio source loads
//  useEffect(() => {
//    if (audioRef.current && audioSrc) {
//      audioRef.current.playbackRate = playbackSpeed;
//    }
//  }, [audioSrc]); // Re-apply speed if source changes

 // --- Effect Hook: Update Playback Speed ---
 useEffect(() => {
  if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
  }
}, [playbackSpeed, audioSrc]); // Update speed if source changes too
// --- End Speed Effect ---

// --- Effect Hook: Cleanup Object URL ---
// This is crucial to prevent memory leaks
useEffect(() => {
  // This function runs when the component unmounts or *before* the effect runs again due to dependency changes
  return () => {
      if (audioSrc && audioSrc.startsWith('blob:')) {
          URL.revokeObjectURL(audioSrc);
          // console.log("Cleaned up Object URL:", audioSrc); // For debugging
      }
  };
}, [audioSrc]); // Dependency array ensures cleanup runs when audioSrc changes
// --- End Cleanup Effect ---



  // Handle flashcard generation - UPDATED
  const handleGenerateFlashcards = async () => {
    if (!sessionId || isGeneratingCards) return;

    setIsGeneratingCards(true);
    setFlashcards([]); // Clear previous cards

    try {
      const data = await fetch("/api/generate_flashcards", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId }),
      });

      const response = await data.json();

      if (!data.ok) {
        throw new Error(response.detail || `Flashcard generation failed with status: ${data.status}`);
      }

      if (response.flashcards && response.flashcards.length > 0) {
        setFlashcards(response.flashcards);
        setCurrentCard(0);
        setIsFlipped(false);
        toast({
          title: "Flashcards Generated",
          description: `Created ${response.flashcards.length} flashcards from the document.`,
        });
      } else {
        toast({
          title: "No Flashcards",
          description: "Could not generate flashcards from this document.",
          variant: "default",
        });
      }

    } catch (error: any) {
      console.error("Flashcard generation failed:", error);
      toast({
        title: "Flashcard Generation Failed",
        description: error.message || "Could not generate flashcards at this time.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCards(false);
    }
  };

  // Handle card flip, next, prev
  const handleCardFlip = () => setIsFlipped(!isFlipped);
  const handleNextCard = () => {
    if (currentCard < flashcards.length - 1) {
      setCurrentCard(currentCard + 1);
      setIsFlipped(false);
    }
  };
  const handlePrevCard = () => {
    if (currentCard > 0) {
      setCurrentCard(currentCard - 1);
      setIsFlipped(false);
    }
  };

  // Handle quiz generation - UPDATED
  const handleGenerateQuiz = async () => {
    if (!sessionId || isGeneratingQuiz) return;

    setIsGeneratingQuiz(true);
    setQuizQuestions([]); // Clear previous quiz
    setQuizSubmitted(false);
    setQuizScore({ correct: 0, total: 0 });
    setSelectedAnswer(null);
    setCurrentQuestion(0);

    try {
      const data = await fetch("/api/generate_quiz", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId }),
      });

      const response = await data.json();

      if (!data.ok) {
        throw new Error(response.detail || `Quiz generation failed with status: ${data.status}`);
      }

      if (response.quizQuestions && response.quizQuestions.length > 0) {
        setQuizQuestions(response.quizQuestions);
        toast({
          title: "Quiz Generated",
          description: `Created a ${response.quizQuestions.length}-question quiz.`,
        });
      } else {
        toast({
          title: "No Quiz Questions",
          description: "Could not generate a quiz from this document.",
        });
      }

    } catch (error: any) {
      console.error("Quiz generation failed:", error);
      toast({
        title: "Quiz Generation Failed",
        description: error.message || "Could not generate a quiz at this time.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // Quiz interaction logic
  const handleSelectAnswer = (index: number) => {
    setSelectedAnswer(index);
  };

  const handleNextQuestion = () => {
    if (selectedAnswer !== null) {
      const currentQ = quizQuestions[currentQuestion];
      if (selectedAnswer === currentQ.correctAnswer) {
        setQuizScore(prev => ({ ...prev, correct: prev.correct + 1 }));
      }
      setQuizScore(prev => ({ ...prev, total: prev.total + 1 }));

      if (currentQuestion < quizQuestions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
      } else {
        setQuizSubmitted(true);
      }
    }
  };

  const handleResetQuiz = () => {
    setQuizQuestions([]);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setQuizScore({ correct: 0, total: 0 });
    setQuizSubmitted(false);
  };


  // Dialog management
  const handleDialogClose = () => setShowFeatures(false);
  const handleOpenFeatures = () => setShowFeatures(true);

  // --- RENDER LOGIC ---
  // (Minor adjustments below for loading/error states)

  return (
    <div className="min-h-screen py-10">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-center mb-8 text-gray-900 dark:text-white">Learning Hub</h1>

          {/* Document URL Input Card */}
          <Card className="border border-gray-200 dark:border-gray-700 shadow-lg max-w-xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link className="h-5 w-5" /> Process Document URL
                </div>
                {isProcessing && <Loader2 className="h-5 w-5 animate-spin text-purple-600" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label htmlFor="document-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Document URL
                  </label>
                  <Input
                    id="document-url"
                    type="url"
                    placeholder="https://drive.google.com/file/d/... or https://example.com/document.pdf"
                    value={documentUrl}
                    onChange={(e) => setDocumentUrl(e.target.value)}
                    className="w-full"
                    disabled={isProcessing}
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Enter the URL of a document you want to analyze. Supports PDF, DOCX, TXT, MD files. 
                    Google Drive links are automatically converted to direct download format.
                  </p>
                </div>

                {processingError && !isProcessing && (
                  <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" /> {processingError}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={handleProcessDocument}
                    disabled={!documentUrl.trim() || isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? "Processing..." : "Process Document"}
                  </Button>
                  
                  {sessionId && !isProcessing && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setDocumentUrl("");
                        setSessionId(null);
                        setChatMessages([]);
                        setFlashcards([]);
                        setQuizQuestions([]);
                        setProcessingError(null);
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>

                {sessionId && !isProcessing && (
                  <div className="mt-4 text-center">
                    <Button onClick={handleOpenFeatures} className="bg-purple-600 hover:bg-purple-500">
                      Access Features
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Features Dialog */}
          <Dialog open={showFeatures} onOpenChange={setShowFeatures}>
            <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Features for:</span>
                  <span className="text-sm font-normal text-gray-500 truncate max-w-xs sm:max-w-sm md:max-w-md" title={documentUrl}>
                    {documentUrl}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-4">
                {/* Chat Section */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 md:col-span-7">
                  <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2"> <MessageSquare className="h-5 w-5" /> Chat </div>
                    {isChatLoading && <Loader2 className="h-5 w-5 animate-spin text-purple-600" />}
                  </h3>
                  <div className="h-80 mb-4 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50 space-y-4">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`p-3 rounded-lg ${
                        msg.type === 'user' 
                          ? 'bg-purple-100 dark:bg-purple-900/30 ml-auto max-w-[80%]' 
                          : 'bg-white dark:bg-gray-700 mr-auto max-w-[80%]'
                      }`}>
                        {msg.content}
                      </div>
                    ))}
                    {isChatLoading && <div className="text-center text-gray-500"><Loader2 className="h-4 w-4 animate-spin inline mr-1" />Thinking...</div>}
                    {chatMessages.length === 0 && !isChatLoading && (
                      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">Ask questions about your document.</div>
                    )}
                  </div>
                  <form onSubmit={handleChatSubmit} className="flex gap-2">
                    <Input // Use Shadcn Input
                      type="text" value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask a question..."
                      className="flex-1"
                      disabled={isChatLoading || !sessionId}
                    />
                    <Button type="submit" disabled={isChatLoading || !sessionId || !question.trim()}>Send</Button>
                  </form>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {/* Quick Action Buttons - Disable while loading */}
                    <Button variant="outline" size="sm" disabled={isChatLoading || !sessionId} onClick={() => { setQuestion("Summarize this document"); setTimeout(() => handleChatSubmit(), 0); }}>Summarize</Button>
                    <Button variant="outline" size="sm" disabled={isChatLoading || !sessionId} onClick={() => { setQuestion("Explain the key concepts"); setTimeout(() => handleChatSubmit(), 0); }}>Key Concepts</Button>
                    <Button variant="outline" size="sm" disabled={isChatLoading || !sessionId} onClick={() => { setQuestion("Explain like I'm 5"); setTimeout(() => handleChatSubmit(), 0); }}>ELI5</Button>
                  </div>
                </div>

                {/* Voice Assistant Section */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 md:col-span-5">
                  <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2"><Mic className="h-5 w-5" /> Voice Assistant</div>
                    {isVoiceLoading && <Loader2 className="h-5 w-5 animate-spin text-purple-600" />}
                  </h3>
                  
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <Button
                        onClick={isListening ? stopListening : startListening}
                        disabled={!sessionId || isVoiceLoading}
                        variant={isListening ? "destructive" : "default"}
                        size="lg"
                        className="rounded-full w-16 h-16"
                      >
                        {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                      </Button>
                    </div>
                    
                    <p className="text-sm text-gray-500">
                      {isListening ? "Listening..." : "Click to ask a voice question"}
                    </p>

                    {voiceQuestion && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Question:</p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">{voiceQuestion}</p>
                      </div>
                    )}

                    {voiceAnswer && (
                      <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">Answer:</p>
                        <p className="text-sm text-green-600 dark:text-green-400">{voiceAnswer}</p>
                      </div>
                    )}
                  </div>
                </div>

{/* Audio Section - UPDATED */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 md:col-span-5 flex flex-col min-h-[300px]"> {/* Added min-height */}
            {/* Header */}
            <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2"><Volume2 className="h-5 w-5" /> Audio Player</div>
                {isGeneratingAudio && <Loader2 className="h-5 w-5 animate-spin text-purple-600" />}
            </h3>

            {/* Main Content Area */}
            <div className="text-center flex-grow flex flex-col justify-center">
                <Ear className="h-10 w-10 mx-auto mb-4 text-gray-400" />

                {/* Status/Error Messages */}
                {error && (
                    <p className="text-red-500 dark:text-red-400 mb-4 text-sm px-4 break-words">
                        Error: {error}
                    </p>
                )}
                <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">
                    {tutorExplanationText ? "Generate audio from the loaded tutor explanation." : "Loading explanation text..."}
                </p>

                {/* Generate Audio Button */}
                <Button
                    onClick={handleGenerateAudio}
                    // Button is disabled if currently generating OR if the text hasn't loaded yet
                    // disabled={isGeneratingAudio || !tutorExplanationText}
                    className="mb-6 mx-auto"
                    size="sm"
                >
                    {isGeneratingAudio ? 'Generating...' : 'Generate Audio'}
                </Button>

                {/* Hidden Audio Element */}
                <audio
                    ref={audioRef}
                    src={audioSrc || undefined} // Use the object URL or undefined if null
                    onEnded={() => setIsPlaying(false)} // Reset play button when audio finishes naturally
                    onPause={() => setIsPlaying(false)} // Handle pause events (e.g., from stop button)
                    onPlay={() => setIsPlaying(true)}   // Ensure playing state is true when playback starts/resumes
                    onError={(e) => {
                        console.error("Audio Element Error:", e);
                        setError("Error loading or playing audio file.");
                        setAudioSrc(null); // Clear broken source
                        setIsPlaying(false);
                    }}
                    // Consider adding controls={true} temporarily for debugging if needed
                />

                {/* Player Controls Area */}
                <div className={`max-w-sm mx-auto p-4 border border-gray-200 dark:border-gray-700 rounded-lg ${!audioSrc ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {/* Play/Pause/Stop Buttons */}
                    <div className="flex justify-around mb-4">
                        <Button variant="outline" size="icon" onClick={togglePlayPause} disabled={!audioSrc || isGeneratingAudio}>
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button variant="outline" size="icon" onClick={handleStop} disabled={!audioSrc || isGeneratingAudio}>
                            <StopCircle className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Speed Selector */}
                    <div className="flex items-center gap-2 justify-center">
                        <span className="text-sm">Speed:</span>
                        <Select
                            value={String(playbackSpeed)}
                            onValueChange={handleSpeedChange} // Correct handler
                            disabled={!audioSrc || isGeneratingAudio}
                        >
                            <SelectTrigger className="w-[80px] h-8 text-xs">
                                <SelectValue placeholder="Speed" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0.75">0.75x</SelectItem>
                                <SelectItem value="1">1x</SelectItem>
                                <SelectItem value="1.25">1.25x</SelectItem>
                                <SelectItem value="1.5">1.5x</SelectItem>
                                <SelectItem value="2">2x</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </div>                {/* --- End Updated Audio Section --- */}

                {/* Flashcards Section */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 md:col-span-6 min-h-[300px]"> {/* Added min-height */}
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><BookmarkPlus className="h-5 w-5" /> Flashcards</h3>
                  {!flashcards.length && !isGeneratingCards && (
                    <div className="text-center py-6 h-full flex flex-col justify-center items-center">
                      <BookmarkPlus className="h-10 w-10 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500 dark:text-gray-400 mb-4">Generate flashcards from the document.</p>
                      <Button onClick={handleGenerateFlashcards} disabled={!sessionId}>Generate Flashcards</Button>
                    </div>
                  )}
                  {isGeneratingCards && (
                    <div className="text-center py-6 h-full flex flex-col justify-center items-center text-gray-500">
                      <Loader2 className="h-8 w-8 animate-spin mb-4 text-purple-600" /> Generating flashcards...
                    </div>
                  )}
                  {flashcards.length > 0 && !isGeneratingCards && (
                    <div className="h-full flex flex-col"> {/* Ensure card container fills space */}
                      {/* Flashcard Display Logic */}
                      <div className="h-48 relative perspective-1000 mb-4">
                        <div className={`w-full h-full absolute transition-transform duration-500 transform-style-preserve-3d ${
                          isFlipped ? 'rotate-y-180' : ''
                        }`}>
                          {/* Front of card */}
                          <div className="absolute w-full h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-center text-center backface-hidden">
                            <p className="text-lg font-medium">{flashcards[currentCard]?.question}</p>
                          </div>
                          {/* Back of card */}
                          <div className="absolute w-full h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-center text-center backface-hidden rotate-y-180">
                            <p className="text-lg">{flashcards[currentCard]?.answer}</p>
                          </div>
                        </div>
                      </div>
                      {/* Controls and Reset Button */}
                      <div className="flex justify-between items-center mt-auto pt-4">
                        <Button size="sm" variant="outline" onClick={handlePrevCard} disabled={currentCard === 0}>Previous</Button>
                        <Button size="sm" variant="outline" onClick={handleCardFlip}>Flip</Button>
                        <Button size="sm" variant="outline" onClick={handleNextCard} disabled={currentCard === flashcards.length - 1}>Next</Button>
                      </div>
                      <div className="mt-2 text-center">
                        <span className="text-sm font-medium">{currentCard + 1} / {flashcards.length}</span>
                      </div>
                      <div className="mt-2 text-center">
                        <Button variant="link" size="sm" onClick={() => setFlashcards([])} className="text-red-500 hover:text-red-600">Clear Cards</Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quiz Section */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 md:col-span-6 min-h-[300px]"> {/* Added min-height */}
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><HelpCircle className="h-5 w-5" /> Quiz</h3>
                  {!quizQuestions.length && !isGeneratingQuiz && (
                    <div className="text-center py-6 h-full flex flex-col justify-center items-center">
                      <HelpCircle className="h-10 w-10 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500 dark:text-gray-400 mb-4">Test your knowledge with a quiz.</p>
                      <Button onClick={handleGenerateQuiz} disabled={!sessionId}>Generate Quiz</Button>
                    </div>
                  )}
                  {isGeneratingQuiz && (
                    <div className="text-center py-6 h-full flex flex-col justify-center items-center text-gray-500">
                      <Loader2 className="h-8 w-8 animate-spin mb-4 text-purple-600" /> Generating quiz...
                    </div>
                  )}
                  {quizQuestions.length > 0 && !isGeneratingQuiz && (
                    <div className="h-full flex flex-col"> {/* Ensure quiz container fills space */}
                      {quizSubmitted ? (
                        <div className="text-center flex flex-col items-center justify-center h-full">
                          <h4 className="text-xl font-semibold mb-4">Quiz Complete!</h4>
                          <p className="text-lg mb-2">Your Score: {quizScore.correct} / {quizScore.total}</p>
                          <p className="text-sm text-gray-500">
                            {quizScore.correct === quizScore.total ? "Perfect! 🎉" : 
                             quizScore.correct >= quizScore.total * 0.8 ? "Great job! 👍" : 
                             quizScore.correct >= quizScore.total * 0.6 ? "Good effort! 💪" : 
                             "Keep studying! 📚"}
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="mb-4">
                            <h4 className="text-lg font-medium mb-2">Question {currentQuestion + 1} of {quizQuestions.length}</h4>
                            <p className="text-gray-700 dark:text-gray-300 mb-4">{quizQuestions[currentQuestion]?.question}</p>
                          </div>
                          <div className="space-y-2 mb-4">
                            {quizQuestions[currentQuestion]?.options.map((option, index) => (
                              <Button
                                key={index}
                                variant={selectedAnswer === index ? "default" : "outline"}
                                className="w-full justify-start text-left"
                                onClick={() => handleSelectAnswer(index)}
                              >
                                {String.fromCharCode(65 + index)}. {option}
                              </Button>
                            ))}
                          </div>
                          <div className="mt-auto pt-4">
                            <Button 
                              onClick={handleNextQuestion} 
                              disabled={selectedAnswer === null}
                              className="w-full"
                            >
                              {currentQuestion === quizQuestions.length - 1 ? "Finish Quiz" : "Next Question"}
                            </Button>
                          </div>
                        </>
                      )}
                      {/* Reset/Try Again Button */}
                      <div className="mt-auto pt-4 text-center">
                        {quizSubmitted && <Button onClick={handleResetQuiz} variant="outline">Try Again</Button>}
                        {!quizSubmitted && <Button variant="link" size="sm" onClick={() => setQuizQuestions([])} className="text-red-500 hover:text-red-600">Clear Quiz</Button>}
                      </div>
                    </div>
                  )}
                </div>

              </div>
              {/* Optional: Add a close button to the dialog footer */}
              {/* <DialogFooter> <Button variant="outline" onClick={handleDialogClose}>Close</Button> </DialogFooter> */}
            </DialogContent>
          </Dialog>
        </motion.div>
      </div>
    </div>
  );
};

export default LearningHub;
