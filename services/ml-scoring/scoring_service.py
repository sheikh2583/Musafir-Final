import base64
import io
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image
from transformers import AutoProcessor, AutoModel
import uvicorn

app = FastAPI()

# Load model and processor
# Using the specialized Arabic CLIP model
MODEL_ID = "Arabic-Clip/araclip" 
print(f"Loading {MODEL_ID}...")

# Use Auto classes for better compatibility
try:
    processor = AutoProcessor.from_pretrained(MODEL_ID)
    model = AutoModel.from_pretrained(MODEL_ID)
    print("Model loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")
    print("Attempting to fall back to standard CLIP connection if specific classes fail...")
    # Fallback to standard OpenAI CLIP if AraCLIP fails (unlikely if internet is up)
    from transformers import CLIPProcessor, CLIPModel
    MODEL_ID = "openai/clip-vit-base-patch32"
    processor = CLIPProcessor.from_pretrained(MODEL_ID)
    model = CLIPModel.from_pretrained(MODEL_ID)
    print(f"Fallback model {MODEL_ID} loaded.")

class ScoringRequest(BaseModel):
    image_base64: str
    target_text: str

@app.post("/score")
async def score_handwriting(request: ScoringRequest):
    try:
        # Decode image
        image_data = base64.b64decode(request.image_base64)
        image = Image.open(io.BytesIO(image_data))
        
        # Prepare inputs
        # AraCLIP expects Arabic text directly.
        # We can also try to prompt it nicely.
        # For a scoring task, we compare the image of the letter to the letter itself.
        
        text_prompts = [
            request.target_text,  # The correct letter/word (e.g. "أ")
            "خربشة",              # "Scribble" / Bad writing
            "فارغ"                # "Empty"
        ]
        
        inputs = processor(
            text=text_prompts, 
            images=image, 
            return_tensors="pt", 
            padding=True
        )
        
        # Inference
        with torch.no_grad():
            outputs = model(**inputs)
            
            # For direct similarity between image and the target text
            # Some models work differently, but standard CLIP/AraCLIP follows this:
            logits_per_image = outputs.logits_per_image 
            probs = logits_per_image.softmax(dim=1) 
            
            # The score is the probability that the image matches prompt[0] (the target text)
            # vs the other negative prompts (scribble, empty).
            # This gives a more robust "quality" score than raw cosine similarity.
            
            score = probs[0][0].item() * 100
            
            # Fallback direct cosine if softmax is weird (e.g. only 1 prompt)
            if len(text_prompts) == 1:
                image_embeds = outputs.image_embeds
                text_embeds = outputs.text_embeds
                image_embeds = image_embeds / image_embeds.norm(p=2, dim=-1, keepdim=True)
                text_embeds = text_embeds / text_embeds.norm(p=2, dim=-1, keepdim=True)
                score = (image_embeds @ text_embeds.T).item() * 100

        return {
            "score": round(score, 2),
            "feedback": f"Scored using {MODEL_ID}. Probability match: {round(score, 2)}%"
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
