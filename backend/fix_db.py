import sqlite3

def fix_db():
    conn = sqlite3.connect('expirygo_local_dev.db')
    cursor = conn.cursor()
    cursor.execute("UPDATE products SET front_image_url = 'https://placehold.co/400x300/e2e8f0/64748b?text=Image+Unavailable' WHERE front_image_url LIKE '%via.placeholder.com%';")
    cursor.execute("UPDATE products SET expiry_image_url = 'https://placehold.co/400x300/e2e8f0/64748b?text=Image+Unavailable' WHERE expiry_image_url LIKE '%via.placeholder.com%';")
    conn.commit()
    conn.close()
    print("Database updated successfully!")

if __name__ == "__main__":
    fix_db()
