import torch
import clip
from PIL import Image


class CLIPMatcher:

    def __init__(self):

        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        self.model, self.preprocess = clip.load(
            "ViT-B/32",
            device=self.device
        )


    def compute_similarity(self, image_path, text_list):

        if len(text_list) == 0:
            return []

        image = self.preprocess(Image.open(image_path)).unsqueeze(0).to(self.device)

        text_tokens = clip.tokenize(text_list).to(self.device)

        with torch.no_grad():

            image_features = self.model.encode_image(image)
            text_features = self.model.encode_text(text_tokens)

            image_features /= image_features.norm(dim=-1, keepdim=True)
            text_features /= text_features.norm(dim=-1, keepdim=True)

            similarity = image_features @ text_features.T

        scores = similarity[0].cpu().numpy().tolist()

        return scores