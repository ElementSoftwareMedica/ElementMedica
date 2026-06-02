import json, glob

assets = '/Users/matteo.michielon/project 2.0/dist/assets/'
lazy_ui_map = sorted(glob.glob(assets + 'lazy-ui-*.js.map'))[-1]

print(f"lazy-ui file: {lazy_ui_map.split('/')[-1]}")
with open(lazy_ui_map) as f:
    m = json.load(f)
print("lazy-ui sources:")
for s in sorted(m.get('sources', [])):
    print(f"  {s}")

# Check main index
main_map = assets + 'index-DpKM75-0.js.map'
with open(main_map) as f:
    m2 = json.load(f)
print("\nMain bundle - check any accordion/dialog/checkbox/popover or more:")
for s in m2.get('sources', []):
    if any(x in s for x in ['accordion', 'dialog', 'checkbox', 'popover', 'design-system/atoms']):
        print(f"  {s}")
