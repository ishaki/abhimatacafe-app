"""One-off helper: dump parsed Excel menu as a Python literal for seeding."""
from import_menu_from_excel import parse_menu, get_excel_path
import pprint

items = parse_menu(get_excel_path())
with open('seed_menu_data.py', 'w', encoding='utf-8') as f:
    f.write('"""Menu seed data generated from `data/Menu Abhimata Cafe.xlsx`.\n\n')
    f.write('Regenerate by running `python _gen_seed.py` in the backend directory\n')
    f.write('after updating the Excel file.\n"""\n\n')
    f.write('MENU_SEED = ')
    f.write(pprint.pformat(items, width=100, sort_dicts=False))
    f.write('\n')
print(f'Wrote {len(items)} items to seed_menu_data.py')
