from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

model_name = "facebook/nllb-200-distilled-600M"

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

text = "Photosynthesis converts light energy into chemical energy."

inputs = tokenizer(
    text,
    return_tensors="pt",
    src_lang="eng_Latn"
)

generated_tokens = model.generate(
    **inputs,
    forced_bos_token_id=tokenizer.lang_code_to_id["mar_Deva"],
    max_length=256
)

print(tokenizer.decode(generated_tokens[0], skip_special_tokens=True))
