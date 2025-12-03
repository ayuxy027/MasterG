// Types for presentation/weave functionality

export interface PresentationRequest {
  topic: string
  language: string
  presentationStyle: "academic" | "business" | "storytelling" | "technical"
  targetAudience: "school" | "college" | "professional" | "training"
  template: string
  numSlides: number
  customCriteria?: Array<{ label: string; value: string }>
}

export interface Slide {
  id: string
  title: string
  content: string
  speakerNotes: string
  imageUrl?: string
  imageBase64?: string
  imagePrompt?: string
  position: number
}

export interface PresentationResponse {
  id: string
  title: string
  topic: string
  language: string
  presentationStyle: "academic" | "business" | "storytelling" | "technical"
  targetAudience: "school" | "college" | "professional" | "training"
  template: string
  slides: Slide[]
  createdAt: Date
}
