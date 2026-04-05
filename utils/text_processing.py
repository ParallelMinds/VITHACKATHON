import re

def parse_manifest(text_file_path):

    items = []

    with open(text_file_path, "r", encoding="utf-8") as f:
        text = f.read()

    text = text.lower()

    # split by comma, newline, semicolon
    tokens = re.split(r"[,\n;]", text)

    for token in tokens:
        token = token.strip()

        # remove numbers like "240 kg"
        token = re.sub(r"\d+", "", token)

        if token != "":
            items.append(token)

    return items