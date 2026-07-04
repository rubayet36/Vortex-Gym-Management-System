import PyPDF2
import re
import mysql.connector
import uuid
import datetime

# Database Connection
try:
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="", # default XAMPP
        database="vortex_gym"
    )
    cursor = conn.cursor(dictionary=True, buffered=True)
except Exception as e:
    print(f"DB Error: {e}")
    exit(1)

# Get Packages
cursor.execute("SELECT id, name, duration_days FROM packages")
packages = cursor.fetchall()

def find_package(pkg_str):
    if not pkg_str or pkg_str == "CASH" or pkg_str == "BKASH" or pkg_str == "CARD":
        return None
    pkg_str = pkg_str.upper()
    
    # Try direct mapping
    for p in packages:
        p_name = p['name'].upper()
        if p_name in pkg_str or pkg_str in p_name:
            return p
    
    # Common mappings
    if "MONTHLY" in pkg_str:
        return next((p for p in packages if "MONTHLY" in p['name'].upper()), None)
    if "STARTER" in pkg_str:
        return next((p for p in packages if "STARTER" in p['name'].upper()), None)
    if "GROWTH" in pkg_str:
        return next((p for p in packages if "GROWTH" in p['name'].upper()), None)
    if "ADVANCE" in pkg_str:
        return next((p for p in packages if "ADVANCE" in p['name'].upper() or "6 MONTH" in p['name'].upper()), None)
    if "3MONTH" in pkg_str or "3 MONTH" in pkg_str:
        return next((p for p in packages if "GROWTH" in p['name'].upper() or "3 MONTH" in p['name'].upper()), None)
    if "6MONTH" in pkg_str or "6 MONTH" in pkg_str:
        return next((p for p in packages if "ADVANCE" in p['name'].upper() or "6 MONTH" in p['name'].upper()), None)
    
    return None

pdf_path = "f:/Vortex-gym-management-main/Vortex-gym-management-main/Document(1).PDF"
reader = PyPDF2.PdfReader(pdf_path)

full_text = ""
for page in reader.pages:
    full_text += page.extract_text() + "\n"

# Pattern for the PDF rows (same as the one I used in import_pdf_data.py but extracting package)
# e.g., 18-02-2026 06:00 AMTamim -0740\n+8801910685283REGULAR_PAYMENT, STARTER\n(1month..., BKASH3500 0 3000 500
# It's a bit messy. Let's use regex.
# Actually, let's split by datetimes.
import re

date_pattern = re.compile(r'(\d{2}-\d{2}-\d{4}\s\d{2}:\d{2}\s[AM|PM]{2})')

parts = date_pattern.split(full_text)
# parts[0] is preamble, parts[1] is Date 1, parts[2] is text 1
records = []
for i in range(1, len(parts), 2):
    date_str = parts[i].strip()
    content = parts[i+1].strip() if i+1 < len(parts) else ""
    # "18-02-2026 06:00 AM" -> datetime
    dt = datetime.datetime.strptime(date_str, "%d-%m-%Y %I:%M %p")
    
    records.append({
        "date": dt,
        "content": content
    })

# Group content by date.
# Actually the content contains Name -PIN \n Phone TYPE, PKG...
added_subs = 0
for r in records:
    c = r['content'].replace('\n', ' ')
    
    phone_match = re.search(r'(\+880\d+)', c)
    if not phone_match:
        continue
    phone = phone_match.group(1).strip()
    
    # check type
    if "DUE_PAYMENT" in c:
        continue # due payments don't add subscriptions usually
        
    # find package substring
    pkg_str = None
    if "REGULAR_PAYMENT," in c:
        pkg_str = c
            
    if pkg_str:
        print(f"Found phone {phone} with pkg string: {pkg_str}")
        matched_pkg = find_package(pkg_str)
        if matched_pkg:
            # find profile
            cursor.execute("SELECT id FROM profiles WHERE phone_number = %s", (phone,))
            profile = cursor.fetchone()
            if profile:
                profile_id = profile['id']
                pkg_id = matched_pkg['id']
                duration = matched_pkg['duration_days']
                
                start_date = r['date'].date()
                end_date = start_date + datetime.timedelta(days=duration)
                
                # Check if this user already has an active subscription for this package
                # OR check if we have any subscription for this user.
                cursor.execute(
                    "SELECT id, status FROM user_subscriptions WHERE user_id = %s AND ABS(DATEDIFF(start_date, %s)) < 5",
                    (profile_id, start_date)
                )
                existing = cursor.fetchall()
                if not existing:
                    # Insert a subscription!
                    sub_id = str(uuid.uuid4())
                    cursor.execute("""
                        INSERT INTO user_subscriptions (id, user_id, package_id, start_date, end_date, status)
                        VALUES (%s, %s, %s, %s, %s, 'active')
                    """, (sub_id, profile_id, pkg_id, start_date, end_date))
                    print(f"Added subscription {matched_pkg['name']} for {phone}")

conn.commit()
print(f"Added {added_subs} missing subscriptions!")

cursor.close()
conn.close()
