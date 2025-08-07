import json, re, time
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager

STAT_KEYS = [
    "Armor", "GlideSpeed", "Speed", "TurnRating", "Agility",
    "Acceleration", "PowerConsumption", "GripRating", "VibrationLevel",
    "Type", "BoostRating", "ExtraHeat", "TemperatureRating",
    "FuelEfficiency", "FuelCapacity", "Seats", "UtilitySlots",
    "MaxVolume", "ItemSlots", "HeatIncrease", "HeatIncreaseSpeed",
    "AmmoType", "Damage", "AoERadius", "RateofFire"
]
MINING_ITEMS = [
    "Copper", "Granite", "Salvaged Metal", "Iron",
    "Carbon", "Erythrite", "Basalt", "Aluminum",
    "Jasmium", "Titanium", "Stravidium"
]

def default_stats():
    return {k: ("" if k in ["Acceleration","Type","HeatIncreaseSpeed","AmmoType"] else 0) for k in STAT_KEYS}

def extract_mining_yield(text):
    output = []
    for item in MINING_ITEMS:
        match = re.search(rf"{item}[^:]*:?\s*(\d+)", text, re.IGNORECASE)
        amt = int(match.group(1)) if match else 0
        output.append({ "amount": amt, "item": item })
    return output

def parse_popover(html):
    soup = BeautifulSoup(html, "html.parser")
    item = {"PartName": "", "Volume": 0, **default_stats(), "MiningYield": extract_mining_yield("")}

    h2 = soup.select_one("h2")
    subtitle = soup.select_one(".subtitle")
    volume = soup.select_one(".da-volume")

    if h2:
        item["PartName"] = h2.text.strip().replace("Dune Awakening ", "")
    if subtitle:
        item["Type"] = subtitle.text.strip().replace("Vehicle - ", "")
    if volume:
        try:
            item["MaxVolume"] = float(volume.text.strip().replace("V", "").strip())
        except:
            item["MaxVolume"] = 0

    stats_td = soup.select_one("td.stats")
    if stats_td:
        for span in stats_td.select("span.stat"):
            label = span.get_text(" ", strip=True)
            value_elem = span.select_one(".stat-value")
            value = value_elem.get_text(strip=True) if value_elem else ""

            clean_label = label.split("(")[0].split("/")[0].strip().replace(" ", "").replace("\xa0", "")
            for key in STAT_KEYS:
                if clean_label.lower().startswith(key.lower()):
                    if isinstance(item[key], int):
                        try:
                            item[key] = int(float(value))
                        except:
                            item[key] = 0
                    else:
                        item[key] = value
                    break

            if "Mining Yield" in label:
                item["MiningYield"] = extract_mining_yield(value)

    return item

def scrape_with_js_injection():
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--window-size=1920,1080")

    driver = webdriver.Chrome(service=ChromeService(ChromeDriverManager().install()), options=chrome_options)
    driver.get("https://duneawakening.wiki.fextralife.com/Vehicles")
    time.sleep(3)

    print("🔧 Injecting JS to trigger all popovers...")
    js_script = """
    const links = document.querySelectorAll("a.wiki_link.wiki_tooltip");
    links.forEach(link => {
      if (typeof link.onmouseover === 'function') {
        link.onmouseover();
      } else {
        link.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      }
    });
    return links.length;
    """
    count = driver.execute_script(js_script)
    print(f"➡️  Triggered mouseover on {count} links")
    time.sleep(5)  # wait for popovers to fully render via JS

    soup = BeautifulSoup(driver.page_source, "html.parser")
    popovers = soup.select("span.popover-content")
    print(f"📦 Loaded {len(popovers)} popovers into DOM")

    all_data = []
    for i, pop in enumerate(popovers, 1):
        html = pop.decode_contents().strip()
        if html:
            item = parse_popover(html)
            if item["PartName"]:
                all_data.append(item)
                print(f"[{i}] ✅ {item['PartName']}")
            else:
                print(f"[{i}] ⚠️ No name found")
        else:
            print(f"[{i}] ❌ Empty popover")

    driver.quit()

    with open("vehicle_parts.json", "w", encoding="utf-8") as f:
        json.dump(all_data, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Extracted {len(all_data)} usable vehicle parts.")

if __name__ == "__main__":
    scrape_with_js_injection()
