import sqlite3

conn = sqlite3.connect('abhimata_cafe.db')
cursor = conn.cursor()

cursor.execute('PRAGMA table_info(orders)')
print('Orders table columns:')
print('-' * 60)
for col in cursor.fetchall():
    nullable = "NULL" if col[3] == 0 else "NOT NULL"
    print(f'{col[1]:20} {col[2]:15} {nullable:10}')

conn.close()
print('\nVerification complete!')
