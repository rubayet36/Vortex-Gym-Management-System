# ZKTeco & Supabase Bridge

This backend script acts as a bridge between your local ZKTeco F22 biometric device and your generic Gym Management Supabase database.

Because web browsers cannot communicate natively via TCP to local hardware items, this script is designed to run on a local machine (like the reception computer) residing on the same network as your ZKTeco machine.

## Prerequisites

1. Install [Node.js](https://nodejs.org/) on the gym's local machine.
2. Ensure the ZKTeco device is connected to the same network and you know its local IP (e.g., `192.168.1.201`).

## Setup

1. Open this `zkteco-bridge` folder in your terminal.
2. Run `npm install` to install the required libraries (`node-zklib`, `@supabase/supabase-js`, `dotenv`).
3. Open the `.env` file and insert:
   - `SUPABASE_URL`: Your Supabase Project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase **Service Role Key** (found in Project Settings -> API). _Do not use the anon key, as this script needs permission to bypass RLS and insert attendance for any user._
   - `ZKTECO_IP`: The IP address of your ZKTeco F22 device.
4. **Member Mapping**: In the `index.js` script, the bridge matches the ZKTeco `deviceUserId` (often a short PIN) against the `phone_number` column in your `profiles` table. When enrolling a new user's fingerprint on the machine, make sure their Machine PIN matches their phone number inside the React Members Manager Dashboard!

## Running the Bridge

Start the bridge by running:

```bash
npm start
```

Or run it directly:

```bash
node index.js
```

The script will instantly reach out to the device, pull down the attendance logs, match the PINs to your database profiles, log the check-ins or check-outs, and then will automatically go to sleep and poll the machine again every 5 minutes.
