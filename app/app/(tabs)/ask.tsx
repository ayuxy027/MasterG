import PDFExtractor from "@/components/PDFExtractor"
import PDFOCRFallback from "@/components/PDFOCRFallback"
import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { useAI } from "@/hooks/useAI"
import {
  PDFJSExtractionResult,
  readPDFAsBase64,
} from "@/services/ai/PDFJSExtractorService"
import PDFQAService from "@/services/ai/PDFQAService"
import { RAGProgress } from "@/services/ai/rag"
import {
  getOCRFallbackMessage,
  needsOCRFallback,
} from "@/services/ai/SmartPDFPipeline"
import { PDFDocument } from "@/types/ai.types"
import { Feather } from "@expo/vector-icons"
import * as DocumentPicker from "expo-document-picker"
import { useCallback, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: string[]
}

export default function AskScreen() {
  const insets = useSafeAreaInsets()
  const { askQuestion, isLoading, isTextModelReady } = useAI()

  const [activeDoc, setActiveDoc] = useState<PDFDocument | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState("")
  const [processing, setProcessing] = useState(false)
  const [showDocInfo, setShowDocInfo] = useState(false)

  // PDF.js extraction state
  const [pdfBase64, setPdfBase64] = useState<string | null>(null)
  const [pendingPdfName, setPendingPdfName] = useState<string>("")
  const [pendingPdfUri, setPendingPdfUri] = useState<string>("")
  const [extractionStatus, setExtractionStatus] = useState<string>("")

  // RAG Progress state
  const [ragProgress, setRagProgress] = useState<RAGProgress | null>(null)

  // OCR Fallback state
  const [useOCRFallback, setUseOCRFallback] = useState(false)

  // RAG progress callback
  const handleRAGProgress = useCallback((progress: RAGProgress) => {
    setRagProgress(progress)
    setExtractionStatus(progress.message)
    console.log(`📊 RAG Progress: ${progress.progress}% - ${progress.message}`)
  }, [])

  // Handle OCR fallback completion
  const handleOCRComplete = useCallback(
    async (result: {
      success: boolean
      text: string
      pageCount: number
      error: string | null
    }) => {
      console.log("🔍 OCR Fallback complete:", {
        success: result.success,
        charCount: result.text.length,
        pageCount: result.pageCount,
      })

      if (result.success && result.text.length > 50) {
        try {
          setExtractionStatus("Indexing document with RAG...")
          const pdfService = PDFQAService.getInstance()
          const doc = await pdfService.createFromText(
            result.text,
            pendingPdfName,
            handleRAGProgress
          )

          setActiveDoc(doc)
          setMessages([
            {
              id: "system",
              role: "assistant",
              content: `✅ Document "${pendingPdfName}" indexed successfully!\n\n📊 **RAG Statistics:**\n- Pages: ${
                result.pageCount
              }\n- Characters: ${result.text.length.toLocaleString()}\n- Method: OCR (image-based PDF)\n\n🔮 RAG-powered search is ready. Ask me anything!`,
            },
          ])

          console.log("✅ Document created from OCR fallback with RAG")
        } catch (error) {
          Alert.alert(
            "Error",
            "Failed to process OCR text: " + (error as Error).message
          )
        }
      } else {
        Alert.alert(
          "Extraction Failed",
          result.error ||
            "Could not extract text from PDF using either PDF.js or OCR.",
          [{ text: "OK" }]
        )
      }

      // Clean up
      setUseOCRFallback(false)
      setPendingPdfUri("")
      setPendingPdfName("")
      setProcessing(false)
      setExtractionStatus("")
      setRagProgress(null)
    },
    [pendingPdfName, handleRAGProgress]
  )

  // Handle PDF.js extraction result - with OCR fallback!
  const handlePDFJSExtraction = useCallback(
    async (result: PDFJSExtractionResult) => {
      console.log("📄 PDF.js extraction complete:", {
        success: result.success,
        charCount: result.charCount,
        error: result.error,
      })

      // Check if we need OCR fallback
      if (needsOCRFallback(result)) {
        console.log("⚠️ PDF.js failed, triggering OCR fallback...")
        setExtractionStatus(getOCRFallbackMessage())

        // Clear PDF.js state and trigger OCR
        setPdfBase64(null)
        setUseOCRFallback(true)
        return // OCR component will take over
      }

      // PDF.js succeeded!
      if (result.success && result.text.length > 50) {
        try {
          setExtractionStatus("Indexing document with RAG...")
          const pdfService = PDFQAService.getInstance()
          const doc = await pdfService.createFromText(
            result.text,
            pendingPdfName,
            handleRAGProgress
          )

          // Get RAG stats for display
          const ragStats = await pdfService.getRAGStats()

          setActiveDoc(doc)
          setMessages([
            {
              id: "system",
              role: "assistant",
              content: `✅ Document "${pendingPdfName}" indexed successfully!\n\n📊 **RAG Statistics:**\n- Characters: ${result.charCount?.toLocaleString()}\n- Chunks: ${
                ragStats?.totalChunks || "N/A"
              }\n- Method: PDF.js text extraction\n\n🔮 RAG-powered search is ready. Ask me anything about your document!`,
            },
          ])

          console.log("✅ Document created from PDF.js extraction with RAG")
        } catch (error) {
          Alert.alert(
            "Error",
            "Failed to process extracted text: " + (error as Error).message
          )
        }

        // Clean up
        setPdfBase64(null)
        setPendingPdfName("")
        setPendingPdfUri("")
        setProcessing(false)
        setExtractionStatus("")
        setRagProgress(null)
      }
    },
    [pendingPdfName, pendingPdfUri, handleRAGProgress]
  )

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      })

      if (result.canceled) return

      const file = result.assets[0]
      setProcessing(true)
      setExtractionStatus("Reading PDF file...")

      try {
        // Save PDF URI for potential OCR fallback
        setPendingPdfUri(file.uri)
        setPendingPdfName(file.name)

        // Read PDF as base64 for PDF.js extraction
        console.log("📄 Starting PDF.js extraction for:", file.name)
        const base64 = await readPDFAsBase64(file.uri)

        // Set state to trigger WebView rendering
        setPdfBase64(base64)
        setExtractionStatus("Extracting text with PDF.js...")

        // The PDFExtractor component will handle the rest
        // If PDF.js fails, it will trigger OCR fallback automatically
      } catch (error) {
        setProcessing(false)
        Alert.alert("Error", "Failed to read PDF: " + (error as Error).message)
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to pick document: " + (error as Error).message
      )
    }
  }

  const handleSend = async () => {
    if (!inputText.trim() || !activeDoc) return
    if (!isTextModelReady) {
      Alert.alert(
        "Model Not Ready",
        "Please initialize the AI engine first from the Learn tab."
      )
      return
    }

    const question = inputText.trim()
    setInputText("")

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: question,
    }
    setMessages((prev) => [...prev, userMsg])

    try {
      const thinkingId = "thinking-" + Date.now()
      setMessages((prev) => [
        ...prev,
        {
          id: thinkingId,
          role: "assistant",
          content: "🔍 Searching relevant sections and generating answer...",
        },
      ])

      // Use RAG-enhanced answering
      const pdfService = PDFQAService.getInstance()
      const response = await pdfService.answerWithRAG({
        question,
        documentId: activeDoc.id,
      })

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === thinkingId
            ? {
                id: Date.now().toString(),
                role: "assistant",
                content: response.answer,
                sources: response.sources.map((s) => `Page ${s.page}`),
              }
            : msg
        )
      )
    } catch (error) {
      setMessages((prev) =>
        prev.filter((msg) => !msg.id.startsWith("thinking-"))
      )

      const errorMsg = (error as Error).message
      const userFriendlyError = errorMsg.includes("not found")
        ? "Document expired. Please upload the PDF again."
        : `Unable to answer: ${errorMsg}`

      Alert.alert("Error", userFriendlyError, [
        { text: "OK" },
        {
          text: "Try Again",
          onPress: () => {
            setInputText(question)
          },
        },
      ])
    }
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Hidden PDF.js Extractor WebView */}
      {pdfBase64 && (
        <PDFExtractor
          pdfBase64={pdfBase64}
          onExtracted={handlePDFJSExtraction}
          onStatus={setExtractionStatus}
          debug={false}
        />
      )}

      {/* OCR Fallback - triggered when PDF.js fails */}
      {useOCRFallback && pendingPdfUri && (
        <PDFOCRFallback
          pdfUri={pendingPdfUri}
          maxPages={10}
          onComplete={handleOCRComplete}
          onStatus={setExtractionStatus}
          debug={false}
        />
      )}

      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>
          Ask PDF
        </ThemedText>
        {activeDoc && (
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => setShowDocInfo(!showDocInfo)}
              style={styles.iconButton}
            >
              <Feather name="info" size={24} color="#6B7280" />
            </Pressable>
            <Pressable
              onPress={() => {
                setActiveDoc(null)
                setMessages([])
                setShowDocInfo(false)
              }}
              style={styles.iconButton}
            >
              <Feather name="x-circle" size={24} color="#EF4444" />
            </Pressable>
          </View>
        )}
      </View>

      {/* Document Info Card */}
      {activeDoc && showDocInfo && (
        <View style={styles.docInfoCard}>
          <View style={styles.docInfoRow}>
            <Feather name="file-text" size={16} color="#6B7280" />
            <ThemedText style={styles.docInfoLabel}>Document:</ThemedText>
            <ThemedText style={styles.docInfoValue}>
              {activeDoc.name}
            </ThemedText>
          </View>
          <View style={styles.docInfoRow}>
            <Feather name="book-open" size={16} color="#6B7280" />
            <ThemedText style={styles.docInfoLabel}>Pages:</ThemedText>
            <ThemedText style={styles.docInfoValue}>
              {activeDoc.pageCount}
            </ThemedText>
          </View>
          <View style={styles.docInfoRow}>
            <Feather name="database" size={16} color="#6B7280" />
            <ThemedText style={styles.docInfoLabel}>Size:</ThemedText>
            <ThemedText style={styles.docInfoValue}>
              {(activeDoc.size / 1024).toFixed(1)} KB
            </ThemedText>
          </View>
        </View>
      )}

      {!activeDoc ? (
        <View style={styles.uploadContainer}>
          <View style={styles.uploadCard}>
            <View style={styles.iconCircle}>
              <Feather
                name={processing ? "loader" : "file-text"}
                size={40}
                color="#F97316"
              />
            </View>
            <ThemedText type="subtitle" style={styles.uploadTitle}>
              {processing
                ? extractionStatus || "Processing PDF..."
                : "Upload a Textbook"}
            </ThemedText>
            <ThemedText style={styles.uploadDesc}>
              {processing
                ? "RAG system will index your document for better Q&A"
                : "Select a PDF to start asking questions about it."}
            </ThemedText>

            {/* RAG Progress Bar */}
            {ragProgress && (
              <View style={styles.ragProgressContainer}>
                <View style={styles.ragProgressBar}>
                  <View
                    style={[
                      styles.ragProgressFill,
                      { width: `${ragProgress.progress}%` },
                    ]}
                  />
                </View>
                <ThemedText style={styles.ragProgressText}>
                  {ragProgress.stage}: {ragProgress.progress}%
                </ThemedText>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.uploadButton,
                (pressed || processing) && styles.pressed,
              ]}
              onPress={handlePickDocument}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Feather name="upload" size={20} color="white" />
              )}
              <ThemedText style={styles.buttonText}>
                {processing ? "Please Wait" : "Choose PDF"}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.chatContainer}>
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            renderItem={({ item }) => (
              <Pressable
                onLongPress={() => {
                  if (item.role === "assistant") {
                    Alert.alert(
                      "Answer Options",
                      "What would you like to do?",
                      [
                        {
                          text: "Copy",
                          onPress: () => {
                            // Note: In React Native, use Clipboard API
                            console.log("Copy:", item.content)
                            Alert.alert(
                              "Copied!",
                              "Answer copied to clipboard."
                            )
                          },
                        },
                        { text: "Cancel", style: "cancel" },
                      ]
                    )
                  }
                }}
                style={[
                  item.role === "user"
                    ? styles.chatBubbleUser
                    : styles.chatBubbleAI,
                ]}
              >
                <ThemedText
                  style={
                    item.role === "user"
                      ? styles.chatTextUser
                      : styles.chatTextAI
                  }
                >
                  {item.content}
                </ThemedText>
                {item.sources && item.sources.length > 0 && (
                  <View style={styles.sourcesContainer}>
                    <ThemedText style={styles.sourcesLabel}>
                      Sources:
                    </ThemedText>
                    <ThemedText style={styles.sourcesText}>
                      {item.sources.join(", ")}
                    </ThemedText>
                  </View>
                )}
              </Pressable>
            )}
          />

          {messages.length > 1 && (
            <View style={styles.chatActions}>
              <Pressable
                onPress={() => {
                  Alert.alert(
                    "Clear Chat",
                    "Are you sure you want to clear all messages?",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Clear",
                        style: "destructive",
                        onPress: () => setMessages([]),
                      },
                    ]
                  )
                }}
                style={styles.clearChatButton}
              >
                <Feather name="trash-2" size={16} color="#EF4444" />
                <ThemedText style={styles.clearChatText}>Clear Chat</ThemedText>
              </Pressable>
            </View>
          )}

          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              placeholder="Ask a question..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <Pressable
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Feather name="send" size={20} color="white" />
              )}
            </Pressable>
          </View>
        </View>
      )}
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB", // Light gray bg
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    color: "#1F2937",
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  docInfoCard: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  docInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  docInfoLabel: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
  },
  docInfoValue: {
    color: "#1F2937",
    fontSize: 14,
    flex: 1,
  },
  sourcesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  sourcesLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },
  sourcesText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  chatActions: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  clearChatButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
  },
  clearChatText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "500",
  },
  uploadContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    paddingBottom: 140,
  },
  uploadCard: {
    backgroundColor: "white",
    borderRadius: 32,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  uploadTitle: {
    marginBottom: 8,
    textAlign: "center",
  },
  uploadDesc: {
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
  },
  ragProgressContainer: {
    width: "100%",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  ragProgressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  ragProgressFill: {
    height: "100%",
    backgroundColor: "#F97316",
    borderRadius: 4,
  },
  ragProgressText: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    textTransform: "capitalize",
  },
  uploadButton: {
    backgroundColor: "#F97316",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 100,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  chatContainer: {
    flex: 1,
    paddingBottom: 140,
  },
  messageList: {
    padding: 20,
  },
  chatBubbleUser: {
    backgroundColor: "#F97316",
    padding: 16,
    borderRadius: 20,
    borderBottomRightRadius: 4,
    alignSelf: "flex-end",
    marginBottom: 12,
    maxWidth: "80%",
  },
  chatTextUser: {
    color: "white",
  },
  chatBubbleAI: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 12,
    maxWidth: "80%",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chatTextAI: {
    color: "#1F2937",
  },
  inputArea: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "white",
    alignItems: "flex-end", // multi-line friendly
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  input: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12, // slightly taller
    maxHeight: 100,
    fontSize: 16,
    color: "#1F2937",
  },
  sendButton: {
    backgroundColor: "#F97316", // Orange-500
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#D1D5DB", // Gray-300
  },
})
