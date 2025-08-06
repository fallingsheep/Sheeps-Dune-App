import os
import json
import re
from bs4 import BeautifulSoup
from pathlib import Path

INPUT_DIR = Path("tables_only")
OUTPUT_JSON = "resources.json"
resources = []

def parse_quantity(text):
    match = re.search(r"[\d,.]+", text)
    return float(match.group(0).replace(",", "")) if match else 0.0

def extract_infobox_data(soup):
    info = {"StackSize": None, "Volume": None}
    box = soup.select_one("table.infobox")
    if box:
        for row in box.select("tr"):
            th = row.find("th")
            td = row.find("td")
            if not th or not td:
                continue
            label = th.text.strip().lower()
            val = td.text.strip()
            if "stack" in label:
                info["StackSize"] = int(parse_quantity(val))
            elif "volume" in label:
                info["Volume"] = float(parse_quantity(val))
    return info

def extract_crafting_data(soup, resource_name):
    results = []
    tables = soup.select("table.wikitable")
    for table in tables:
        rows = table.find_all("tr")
        if len(rows) < 2 or len(rows[0].find_all(["td", "th"])) != 3:
            continue

        for row in rows[1:]:
            cols = row.find_all("td")
            if len(cols) != 3:
                continue

            station_cell = cols[0]
            ingredients_cell = cols[1]
            output_cell = cols[2]

             # ✅ Look for exact product match in output column
            match_found = False
            for a in output_cell.find_all("a", title=True):
                if a["title"].strip().lower() == resource_name.lower():
                    match_found = True
                    break

            if not match_found:
                continue

            station = station_cell.get_text(strip=True) or "Unknown Station"
            ingredient_items = ingredients_cell.find_all("li")

            ingredients = []
            crafting_time = 0.0

            for li in ingredient_items:
                txt = li.get_text(strip=True)
                if re.search(r"\d+(s|sec|min)", txt):
                    crafting_time = parse_quantity(txt)
                elif "water" in txt.lower():
                    ingredients.append({
                        "item": "Water",
                        "quantity": parse_quantity(txt)
                    })
                else:
                    qty = parse_quantity(txt)
                    item = re.sub(r"x\d+.*", "", txt).strip()
                    item = re.sub(r"^\d+x\s*", "", item)
                    ingredients.append({"item": item, "quantity": qty})

            if ingredients:
                results.append({
                    "station": station,
                    "craftingtime": crafting_time,
                    "ingredients": ingredients
                })
    return results

def extract_used_in(soup, current_name=None):
    used_in = []

    # Look through all wikitable tables
    for table in soup.find_all("table", class_="wikitable"):
        header_row = table.find("tr")
        if not header_row:
            continue

        headers = header_row.find_all("th")
        if len(headers) >= 3 and "products" in headers[2].get_text(strip=True).lower():
            # This is a table with a Products column in third position
            rows = table.find_all("tr")[1:]  # Skip header

            for row in rows:
                cols = row.find_all("td")
                if len(cols) >= 3:
                    products_td = cols[2]
                    for li in products_td.find_all("li"):
                        a_tag = li.find("a", title=True)
                        if a_tag:
                            product_name = a_tag["title"].strip()
                            if (
                                not current_name or product_name != current_name
                            ) and product_name not in used_in:
                                used_in.append(product_name)

            break  # Stop after first matching table

    return used_in



def parse_resource(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f, "html.parser")

    name = file_path.stem.replace("_", " ")
    info = extract_infobox_data(soup)
    crafted = extract_crafting_data(soup, name)
    used_in = extract_used_in(soup, name)

    return {
        "name": name,
        "StackSize": info["StackSize"],
        "Volume": info["Volume"],
        "craftedAt": crafted,
        "usedIn": used_in
    }

# ========== MAIN LOOP ==========
for html_file in sorted(INPUT_DIR.glob("*.html")):
    print(f"Parsing {html_file.name}")
    resource = parse_resource(html_file)
    resources.append(resource)

with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
    json.dump(resources, f, indent=2)

print(f"✅ Done. {len(resources)} resources written to {OUTPUT_JSON}")
