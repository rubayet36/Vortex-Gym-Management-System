import mysql.connector

try:
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="vortex_gym"
    )
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM profiles WHERE phone_number = '+8801728257431'")
    profile = cursor.fetchone()
    print("Profile:", profile)
    if profile:
        cursor.execute("SELECT * FROM user_subscriptions WHERE user_id = %s", (profile['id'],))
        subs = cursor.fetchall()
        print("Subscriptions:", subs)
        print(row)
except Exception as e:
    print(e)
