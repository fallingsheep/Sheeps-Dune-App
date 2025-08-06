import os
import re
import requests
from bs4 import BeautifulSoup

# === Configuration ===
html_file_path = "sandbike.html"  # Replace with your actual file
output_dir = "downloaded_images"
image_pattern = re.compile(r'^https://media\.awakening\.wiki/wiki/.*\.(jpg|png)$')

# === Ensure output directory exists ===
os.makedirs(output_dir, exist_ok=True)

# === Read and parse HTML ===
with open(html_file_path, "r", encoding="utf-8") as file:
    soup = BeautifulSoup(file, "html.parser")

# === Find all image links matching the pattern ===
found_urls = set()
for tag in soup.find_all(["img", "a"]):
    url = tag.get("src") or tag.get("href")
    if url and image_pattern.match(url):
        found_urls.add(url)

print(f"Found {len(found_urls)} images to download.")

# === Download all matched images ===
for url in found_urls:
    filename = os.path.basename(url)
    output_path = os.path.join(output_dir, filename)

    try:
        print(f"Downloading {url}...")
        response = requests.get(url, stream=True)
        response.raise_for_status()

        with open(output_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        print(f"Saved to {output_path}")
    except Exception as e:
        print(f"Failed to download {url}: {e}")
