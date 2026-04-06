import sqlite3

conn = sqlite3.connect('abhimata_cafe.db')
cursor = conn.cursor()

print('\nUsers in database:')
print('-' * 40)
cursor.execute('SELECT username, role FROM users')
for row in cursor.fetchall():
    print(f'Username: {row[0]:15} Role: {row[1]}')
print('-' * 40)

print('\nMenu items count:')
cursor.execute('SELECT COUNT(*) FROM menu_items')
menu_count = cursor.fetchone()[0]
print(f'Total menu items: {menu_count}')

conn.close()
print('\n✓ Database verification complete!')
