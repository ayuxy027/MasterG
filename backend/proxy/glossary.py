"""
Scientific and educational term glossary for IndicTrans2 translation.

This module provides glossary locking functionality to preserve
scientific terms during translation by replacing them with placeholders
and restoring correct target-language terms post-translation.
"""

# English -> Hindi scientific terms
ENGLISH_TO_HINDI_GLOSSARY = {
    # Biology
    "photosynthesis": "प्रकाश संश्लेषण",
    "chlorophyll": "क्लोरोफिल",
    "carbon dioxide": "कार्बन डाइऑक्साइड",
    "oxygen": "ऑक्सीजन",
    "glucose": "ग्लूकोज",
    "atp": "एटीपी",
    "dna": "डीएनए",
    "rna": "आरएनए",
    "cell": "कोशिका",
    "mitochondria": "माइटोकॉन्ड्रिया",
    "nucleus": "केंद्रक",
    "chromosome": "गुणसूत्र",
    "gene": "जीन",
    "protein": "प्रोटीन",
    "enzyme": "एंजाइम",
    "respiration": "श्वसन",
    "digestion": "पाचन",
    "metabolism": "चयापचय",
    
    # Chemistry
    "molecule": "अणु",
    "atom": "परमाणु",
    "element": "तत्व",
    "compound": "यौगिक",
    "reaction": "अभिक्रिया",
    "catalyst": "उत्प्रेरक",
    "acid": "अम्ल",
    "base": "क्षार",
    "salt": "लवण",
    "solution": "विलयन",
    "mixture": "मिश्रण",
    "hydrogen": "हाइड्रोजन",
    "nitrogen": "नाइट्रोजन",
    "sodium": "सोडियम",
    "calcium": "कैल्शियम",
    
    # Physics
    "force": "बल",
    "energy": "ऊर्जा",
    "velocity": "वेग",
    "acceleration": "त्वरण",
    "momentum": "संवेग",
    "gravity": "गुरुत्वाकर्षण",
    "friction": "घर्षण",
    "pressure": "दबाव",
    "temperature": "तापमान",
    "heat": "ऊष्मा",
    "light": "प्रकाश",
    "sound": "ध्वनि",
    "wave": "तरंग",
    "electricity": "विद्युत",
    "magnetism": "चुंबकत्व",
    
    # Mathematics
    "equation": "समीकरण",
    "formula": "सूत्र",
    "variable": "चर",
    "constant": "अचर",
    "function": "फलन",
    "derivative": "अवकलज",
    "integral": "समाकलन",
    "angle": "कोण",
    "triangle": "त्रिभुज",
    "circle": "वृत्त",
    "square": "वर्ग",
    "rectangle": "आयत",
    "area": "क्षेत्रफल",
    "perimeter": "परिमाप",
    "volume": "आयतन",
    
    # Common educational terms
    "definition": "परिभाषा",
    "example": "उदाहरण",
    "concept": "अवधारणा",
    "principle": "सिद्धांत",
    "theory": "सिद्धांत",
    "law": "नियम",
    "process": "प्रक्रिया",
    "system": "तंत्र",
    "structure": "संरचना",
    "function": "कार्य",
}

# Create reverse lookup for restoration
HINDI_TO_ENGLISH_GLOSSARY = {v: k for k, v in ENGLISH_TO_HINDI_GLOSSARY.items()}


def create_placeholder(term: str, index: int) -> str:
    """Create a unique placeholder for a term (tokenizer-safe format)"""
    # Use a format that won't be split: single token with special prefix
    # Using format like "SCI0", "SCI1" etc. that's more likely to stay as one token
    return f"SCI{index}"


def extract_and_replace_terms(text: str) -> tuple[str, dict[str, str]]:
    """
    Extract scientific terms and replace with placeholders.
    
    Returns:
        (modified_text, term_map) where term_map maps placeholders to target-language terms
    """
    import re
    
    text_lower = text.lower()
    term_map = {}
    modified_text = text
    index = 0
    
    # Sort terms by length (longest first) to avoid partial matches
    sorted_terms = sorted(ENGLISH_TO_HINDI_GLOSSARY.items(), key=lambda x: len(x[0]), reverse=True)
    
    for english_term, hindi_term in sorted_terms:
        # Create case-insensitive regex pattern
        pattern = re.compile(re.escape(english_term), re.IGNORECASE)
        
        # Find all matches
        matches = list(pattern.finditer(text_lower))
        
        for match in matches:
            # Check if already replaced
            start, end = match.span()
            # Check if this position is already a placeholder
            if start > 0 and modified_text[max(0, start-5):end+5].startswith("SCI"):
                continue
            
            placeholder = create_placeholder(english_term, index)
            term_map[placeholder] = hindi_term
            
            # Replace in original text (preserve case)
            original_match = text[start:end]
            modified_text = modified_text[:start] + placeholder + modified_text[end:]
            
            # Update text_lower for next iteration
            text_lower = modified_text.lower()
            index += 1
    
    return modified_text, term_map


def restore_terms(translated_text: str, term_map: dict[str, str]) -> str:
    """
    Restore scientific terms from placeholders.
    Conservative restoration:
    - Only replace explicit placeholder tokens like "SCI0", "SCI1", etc.
    - Do NOT try to be smart about transliterated or partially split placeholders.
      (Those heuristics can corrupt otherwise good translations.)
    """
    result = translated_text

    # Sort by numeric index so replacements are deterministic
    def _index_from_placeholder(ph: str) -> int:
        import re as _re
        m = _re.search(r"(\d+)", ph)
        return int(m.group(1)) if m else 0

    for placeholder, target_term in sorted(
        term_map.items(), key=lambda kv: _index_from_placeholder(kv[0])
    ):
        # Exact placeholder replacement only
        if placeholder in result:
            result = result.replace(placeholder, target_term)

    return result

