# Stitch - Offline Multilingual Educational Content Generator

## Overview
Stitch resolves the offline content generation crisis by enabling multilingual educational content creation using an offline LLM (Ollama with DeepSeek). The system generates curriculum-aligned content across 22+ Indian languages that teachers can directly use as explanations, notes, and lesson material.

## Core Problem Solved
Rural Indian students face barriers accessing quality educational content in native languages. Current systems are English-focused and require internet connectivity. Stitch enables offline, multilingual content generation with high precision for mathematical and scientific explanations.

## User Flow

### Initial Setup
User visits `/stitch` page —> System checks for Ollama connection status —> If Ollama not connected, displays setup instructions for offline LLM installation —> User selects DeepSeek model from available Ollama models —> System verifies model download and availability (4-8GB RAM check) —> Model ready for offline content generation

### Content Generation Flow
User selects target language from 22+ Indian languages (Hindi, Bengali, Tamil, Telugu, Kannada, Malayalam, Marathi, Gujarati, Punjabi, Urdu, Odia, Assamese, etc.) —> User selects grade level (Class 3, 8, 12, etc.) for age-appropriate content scaling —> User selects subject/category (Mathematics, Science, Social Studies, Language) —> User enters topic or lesson title (e.g., "Photosynthesis", "Quadratic Equations") —> User selects curriculum board (NCERT, CBSE, State Board) for alignment —> User optionally selects cultural context (Regional festivals, local examples)

### AI Generation Process
System constructs prompt with all parameters (language, grade, subject, topic, curriculum, cultural context) —> Prompt sent to offline Ollama API (DeepSeek model) —> Model generates **plain-text educational content** with:
- Proper script accuracy for chosen language
- Age-appropriate vocabulary and depth
- Cultural references and local examples
- Curriculum-aligned structure and content
- Code-mixing support (e.g., Hindi-English scientific terms)

### Content Preview & Thinking View
Generated content is displayed in the Stitch preview pane in real time —> Users can see the **exact text output** being produced by the model —> Thinking stream is shown separately so users can see how the model reasons.

### User Interaction & Editing
User can review preview in chat interface —> User can request edits or modifications via natural language —> User can adjust language complexity or add/remove sections —> System regenerates content based on feedback —> Preview updates in real-time —> User can iterate until satisfied

### PDF Generation

**Current behavior:**
- PDF generation is not implemented. Teachers can copy content from the preview and paste it into their own document templates (e.g., Word, Google Docs, or any LMS).

**Planned behavior (full version):**
- System compiles content into nicely formatted PDFs suitable for printing and sharing.

### Export & Storage
Generated content can be easily copied and saved into the teacher's preferred tools —> Future versions may support direct export as PDFs or other formats —> Generated content can be cached locally for faster future access

## Technical Architecture

### Offline LLM Integration
- **Ollama API**: Local model serving for offline operation
- **DeepSeek Model**: Optimized for multilingual Indian language content
- **Memory Management**: Efficient inference for 4-8GB RAM constraints
- **Model Selection**: User can choose different model sizes based on device capability

### Content Processing
- **Generation**: LLM generates structured plain-text explanations, examples, and questions
- **Preview**: Browser-based plain-text preview
- **Export (planned)**: Future pipeline to format content into PDFs or other distribution formats

### Multilingual Support
- **Script Rendering**: Proper display of Devanagari, Bengali, Tamil, Telugu, Kannada, Malayalam, Gurmukhi, Gujarati, Odia scripts
- **Language Detection**: Automatic script and language identification
- **Font Mapping**: Correct font selection for each script family
- **Code-Mixing**: Seamless handling of mixed-language content (e.g., Hindi-English)

### Curriculum Alignment
- **NCERT Standards**: Content aligned with NCERT curriculum structure
- **CBSE Guidelines**: Adherence to CBSE educational standards
- **State Boards**: Support for various state board curricula
- **Grade-Appropriate**: Automatic complexity adjustment based on class level

## UI Components

### Main Interface
- **Language Selector**: Dropdown with 22+ Indian languages
- **Grade Level Selector**: Class 3, 8, 12 options with custom input
- **Subject Selector**: Mathematics, Science, Social Studies, Languages
- **Topic Input**: Text input for lesson/topic name
- **Curriculum Selector**: NCERT, CBSE, State Board options
- **Cultural Context Toggle**: Optional regional customization

### Chat Interface Preview
- **Preview Pane**: Real-time plain-text content display
- **Edit Controls**: Request modifications via text input
- **Regenerate Button**: Create new version of content
- **Scrollable View**: Handle long-form content

### Action Buttons
- **Generate Content**: Starts streaming generation with thinking text + content output
- **Stop Generating**: Cancels the current generation stream
- *(Future)* **Generate PDF**: Export generated content as a nicely formatted PDF
- *(Future)* **Share**: Export options for sharing
- *(Future)* **Clear**: Start new content generation

## Success Metrics
- **Offline Operation**: 100% functionality without internet connection
- **Language Accuracy**: ≥95% script accuracy across all supported languages
- **Mathematical Notation**: ≥98% symbol accuracy (SAR)
- **Content Quality**: ≥95% curriculum alignment accuracy
- **Generation Speed**: <30 seconds for standard content on 4-8GB RAM devices
- **PDF Quality**: Professional-grade formatting with proper typography

## Future Enhancements
- **Voice Input**: Teachers can speak topic descriptions
- **Template Library**: Pre-built templates for common topics
- **Collaboration**: Share and collaborate on generated content
- **Batch Generation**: Generate multiple lessons at once
- **Image Integration**: Include diagrams and illustrations in the generated content
- **Interactive Elements**: Add interactive components to PDF (hyperlinks, bookmarks)

