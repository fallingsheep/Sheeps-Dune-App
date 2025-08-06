import time
import json
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

resource_urls  = [
  "https://awakening.wiki/Advanced_Machinery",
  "https://awakening.wiki/Advanced_Servoks",
  "https://awakening.wiki/Armor_Plating",
  "https://awakening.wiki/Atmospheric_Filtered_Fabric",
  "https://awakening.wiki/Ballistic_Weave_Fabric",
  "https://awakening.wiki/Blade_Parts",
  "https://awakening.wiki/Calibrated_Servok",
  "https://awakening.wiki/Carbide_blade_parts",
  "https://awakening.wiki/Carbide_Scraps",
  "https://awakening.wiki/Complex_Machinery",
  "https://awakening.wiki/Diamodine_blade_parts",
  "https://awakening.wiki/Diamondine_Dust",
  "https://awakening.wiki/EMF_Generator",
  "https://awakening.wiki/Fluid_Efficient_Industrial_Pump",
  "https://awakening.wiki/Fluted_Heavy_Caliber_Compressor",
  "https://awakening.wiki/Fluted_Light_Caliber_Compressor",
  "https://awakening.wiki/Gun_Parts",
  "https://awakening.wiki/Heavy_Caliber_Compressor",
  "https://awakening.wiki/Holtzman_Actuator",
  "https://awakening.wiki/Hydraulic_Piston",
  "https://awakening.wiki/Improved_Holtzman_Actuator",
  "https://awakening.wiki/Improved_Watertube",
  "https://awakening.wiki/Industrial_Pump",
  "https://awakening.wiki/Insulated_Fabric",
  "https://awakening.wiki/Irradiated_Core",
  "https://awakening.wiki/Irradiated_Slag",
  "https://awakening.wiki/Light_Caliber_Compressor",
  "https://awakening.wiki/Mechanical_Parts",
  "https://awakening.wiki/Micro-sandwich_Fabric",
  "https://awakening.wiki/Military_Power_Regulator",
  "https://awakening.wiki/Muad%27Dib_Corpse",
  "https://awakening.wiki/Off-world_Medical_Supplies",
  "https://awakening.wiki/Opafire_Gem",
  "https://awakening.wiki/Overclocked_Power_Regulator",
  "https://awakening.wiki/Particle_Capacitor",
  "https://awakening.wiki/Plasteel_Composite_Armor_Plating",
  "https://awakening.wiki/Plasteel_Composite_Blade_Parts",
  "https://awakening.wiki/Plasteel_Composite_Gun_Parts",
  "https://awakening.wiki/Plasteel_Microflora_Fiber",
  "https://awakening.wiki/Plasteel_Plate",
  "https://awakening.wiki/Precision_Range_Finder",
  "https://awakening.wiki/Range_Finder",
  "https://awakening.wiki/Ray_Amplifier",
  "https://awakening.wiki/Sandtrout_Leathers",
  "https://awakening.wiki/Ship_Manifest",
  "https://awakening.wiki/Spice-infused_Aluminum_Dust",
  "https://awakening.wiki/Spice-infused_Copper_Dust",
  "https://awakening.wiki/Spice-infused_Duraluminum_Dust",
  "https://awakening.wiki/Spice-infused_Iron_Dust",
  "https://awakening.wiki/Spice-infused_Plastanium_Dust",
  "https://awakening.wiki/Spice-infused_Steel_Dust",
  "https://awakening.wiki/Stillsuit_Tubing",
  "https://awakening.wiki/Thermo-Responsive_Ray_Amplifier",
  "https://awakening.wiki/Thermoelectric_Cooler",
  "https://awakening.wiki/Tri-Forged_Hydraulic_Piston",
  "https://awakening.wiki/Worm_Tooth",
  "https://awakening.wiki/Agave_Seeds",
  "https://awakening.wiki/Aluminum_Ore",
  "https://awakening.wiki/Basalt_Stone",
  "https://awakening.wiki/Carbon_Ore",
  "https://awakening.wiki/Copper_Ore",
  "https://awakening.wiki/Corpse",
  "https://awakening.wiki/Erythrite_Crystal",
  "https://awakening.wiki/Flour_Sand",
  "https://awakening.wiki/Fuel_Cell",
  "https://awakening.wiki/Granite_Stone",
  "https://awakening.wiki/Iron_Ore",
  "https://awakening.wiki/Jasmium_Crystal",
  "https://awakening.wiki/Mouse_Corpse",
  "https://awakening.wiki/Salvaged_Metal",
  "https://awakening.wiki/Spice_Residue",
  "https://awakening.wiki/Stravidium_Mass",
  "https://awakening.wiki/Titanium_Ore",
  "https://awakening.wiki/Advanced_Particulate_Filter",
  "https://awakening.wiki/Aluminum_Ingot",
  "https://awakening.wiki/Cobalt_Paste",
  "https://awakening.wiki/Copper_Ingot",
  "https://awakening.wiki/Duraluminum_Ingot",
  "https://awakening.wiki/Industrial-grade_Lubricant",
  "https://awakening.wiki/Iron_Ingot",
  "https://awakening.wiki/Large_Vehicle_Fuel_Cell",
  "https://awakening.wiki/Low-grade_Lubricant",
  "https://awakening.wiki/Makeshift_Filter",
  "https://awakening.wiki/Medium_Sized_Vehicle_Fuel_Cell",
  "https://awakening.wiki/Particulate_Filter",
  "https://awakening.wiki/Plastanium_Ingot",
  "https://awakening.wiki/Plastone",
  "https://awakening.wiki/Silicone_Block",
  "https://awakening.wiki/Small_Vehicle_Fuel_Cell",
  "https://awakening.wiki/Spice_Melange",
  "https://awakening.wiki/Spice-infused_Fuel_Cell",
  "https://awakening.wiki/Standard_Filter",
  "https://awakening.wiki/Steel_Ingot",
  "https://awakening.wiki/Stravidium_Fiber"
]

# Output folder
os.makedirs("tables_only", exist_ok=True)

# Setup headless Chrome
chrome_options = Options()
chrome_options.add_argument("--headless")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--no-sandbox")

driver = webdriver.Chrome(options=chrome_options)

for url in resource_urls:
    print(f"Processing: {url}")
    driver.get(url)
    time.sleep(1)  # let page load

    # Expand all collapsible elements
    spans = driver.find_elements(By.CSS_SELECTOR, 'span.mw-collapsible-text')
    for span in spans:
        if span.text.strip().lower() == "expand":
            try:
                driver.execute_script("arguments[0].click();", span)
                time.sleep(0.2)
            except Exception as e:
                print(f"Failed to expand: {e}")

    # Extract only matching tables
    tables = []
    table_selectors = [
        'table.infobox',
        'table.wikitable.mw-collapsible.mw-made-collapsible'
    ]
    for selector in table_selectors:
        tables.extend(driver.find_elements(By.CSS_SELECTOR, selector))

    # Combine all tables as HTML
    table_html = "\n\n".join([table.get_attribute("outerHTML") for table in tables])

    # Save to file
    slug = url.split("/")[-1]
    output_path = os.path.join("tables_only", f"{slug}.html")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(table_html)

    print(f"✔ Saved: {output_path}")

driver.quit()
print("✅ Done extracting and saving tables.")