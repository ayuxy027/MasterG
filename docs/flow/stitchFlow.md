# Stitch - Offline Multilingual Educational Content Generator

## Overview
Stitch resolves the offline content generation crisis by enabling multilingual educational content creation using an offline LLM (Ollama with DeepSeek). The system generates curriculum-aligned content across 22+ Indian languages that teachers can directly use as explanations, notes, and lesson material.

## Core Problem Solved
Rural Indian students face barriers accessing quality educational content in native languages. Current systems are English-focused and require internet connectivity. Stitch enables offline, multilingual content generation with high precision for mathematical and scientific explanations.

## User Flow

### Initial Setup
User visits `/stitch` page —> System checks for Ollama connection status —> If Ollama not connected, displays setup instructions for offline LLM installation —> User selects DeepSeek model from available Ollama models —> System verifies model download and availability (4-8GB RAM check) —> Model ready for offline content generation

### Content Generation Flow
User enters topic or lesson title (e.g., "Photosynthesis", "Quadratic Equations") —> User selects grade level (Class 3, 8, 12, etc.) for age-appropriate content scaling —> User selects subject (Mathematics, Science, Social Studies, etc.) —> System constructs comprehensive prompt with all parameters —> Content generated in English using DeepSeek R1 via Ollama —> Generated English content translated to selected language using NLLB-200 —> Users can see the **exact text output** being produced by the model with **thinking stream** —> User can request edits or modifications via natural language —> System regenerates content based on feedback —> Preview updates in real-time —> Generated content can be easily copied and saved

### Translation Process
Generated English content is automatically translated to selected language using NLLB-200 model —> Translation supports 22+ Indian languages with proper script accuracy —> Users can see both English and translated versions —> Streaming translation available for large content

### Export & Storage
Generated content can be easily copied and saved into the teacher's preferred tools —> Content available in both English and translated versions —> Generated content can be cached locally for faster future access

## Technical Architecture

### Offline LLM Integration
- **Ollama API**: Local model serving for offline operation
- **DeepSeek Model**: Optimized for educational content generation
- **Memory Management**: Efficient inference for 4-8GB RAM constraints
- **Model Selection**: User can choose different model sizes based on device capability

### Translation System
- **NLLB-200**: 600M parameter multilingual translation model supporting 200+ languages
- **FLORES-200 Format**: Proper language code handling for Indian scripts
- **Streaming Translation**: Sentence-by-sentence processing for large content
- **Offline Operation**: Complete translation without internet dependency

### Content Processing
- **Generation**: LLM generates structured plain-text explanations, examples, and questions
- **Translation**: English content translated to 22+ Indian languages with proper script accuracy
- **Preview**: Browser-based plain-text preview with thinking stream visibility
- **Streaming**: Real-time content generation with thinking text and response streaming

### Multilingual Support
- **Script Rendering**: Proper display of Devanagari, Bengali, Tamil, Telugu, Kannada, Malayalam, Gurmukhi, Gujarati, Odia scripts
- **Language Codes**: FLORES-200 format for NLLB-200 compatibility
- **Code-Mixing**: Seamless handling of mixed-language content (e.g., Hindi-English)

### Curriculum Alignment
- **NCERT Standards**: Content aligned with NCERT curriculum structure
- **CBSE Guidelines**: Adherence to CBSE educational standards
- **State Boards**: Support for various state board curricula
- **Grade-Appropriate**: Automatic complexity adjustment based on class level

## UI Components

### Main Interface
- **Topic Input**: Text input for lesson/topic name
- **Grade Level Selector**: Class 3, 8, 12 options with custom input
- **Subject Selector**: Mathematics, Science, Social Studies, Languages
- **Language Selector**: Dropdown with 22+ Indian languages for output

### Content Preview
- **Thinking Stream**: Real-time display of AI reasoning process
- **Content Output**: Final generated educational content
- **Translation Display**: Both English and translated versions
- **Edit Controls**: Request modifications via text input

### Action Buttons
- **Generate Content**: Starts streaming generation with thinking text + content output
- **Translate Content**: Translates generated English content to selected language
- **Copy Content**: Copy generated content for external use
- **Clear**: Start new content generation

## Success Metrics
- **Offline Operation**: 100% functionality without internet connection
- **Language Accuracy**: ≥95% script accuracy across all supported languages
- **Mathematical Notation**: ≥98% symbol accuracy (SAR)
- **Content Quality**: ≥95% curriculum alignment accuracy
- **Generation Speed**: <30 seconds for standard content on 4-8GB RAM devices
- **Translation Quality**: ≥95% accuracy across 15+ languages

## Future Enhancements
- **Voice Input**: Teachers can speak topic descriptions
- **Template Library**: Pre-built templates for common topics
- **Collaboration**: Share and collaborate on generated content
- **Batch Generation**: Generate multiple lessons at once
- **Image Integration**: Include diagrams and illustrations in the generated content
- **PDF Export**: Format content into nicely formatted PDFs for printing

