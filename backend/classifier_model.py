import torch
import torch.nn as nn
import torchvision.models as models

device = "cuda" if torch.cuda.is_available() else "cpu"
NUM_CLASSES = 12
DROPOUT = 0.2

print(f"Device: {device}")

class ClassifierNet(nn.Module):
    def __init__(self, num_classes: int = NUM_CLASSES, dropout: float = DROPOUT):
        super().__init__()
        backbone = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
        in_features = backbone.fc.in_features
        backbone.fc = nn.Identity()
        self.encoder = backbone
        self.head = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(in_features, num_classes),
        )

    def forward(self, x):
        feat = self.encoder(x)
        logits = self.head(feat)
        return logits


def build_classifier(num_classes: int, dropout: float = DROPOUT, device_name: str = device):
    model = ClassifierNet(num_classes=num_classes, dropout=dropout)
    return model.to(device_name)


def count_trainable_params(model: nn.Module) -> int:
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


def smoke_test() -> tuple[ClassifierNet, torch.Size]:
    model = build_classifier(num_classes=NUM_CLASSES)
    dummy = torch.randn(4, 3, 224, 224, device=device)
    with torch.no_grad():
        out = model(dummy)

    assert out.shape == (4, NUM_CLASSES), f"Unexpected output shape: {out.shape}"
    print("Output shape:", out.shape)
    print("Trainable params:", count_trainable_params(model))
    return model, out.shape


if __name__ == "__main__":
    smoke_test()
