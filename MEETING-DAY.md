# Meeting day

`SITE` = your production domain, e.g. `deluj.vercel.app`.

## Before Hosny arrives (15 min)

1. Charge phone, iPad, laptop. Do Not Disturb on all three.
2. iPad and laptop: turn auto-lock / sleep **off**.
3. iPad and laptop: open `https://SITE/staff` and `https://SITE/owner` and enter the access code once (remembered 30 days). The phone never needs it.
4. Laptop → `https://SITE/owner` → **Settings** → **Reset demo…** → **Reset demo**.
5. Open the three screens below. Each must show a green **Live** dot.
6. iPad: tap **Enable chime** once. Volume up.
7. Laptop: also open `/order/table-07` and `/staff` once in other tabs, so the Wi-Fi fallback works offline.
8. Put the printed Table 07 card on the table.

## How to reset

Laptop → `https://SITE/owner` → **Settings** → **Reset demo…** → **Reset demo**.
All three screens refresh by themselves. Do it again between rehearsals.

## Which device gets which screen

| Device | Screen | Open |
| --- | --- | --- |
| **Phone** (hand to Hosny) | Guest menu | scan the Table 07 card (= `https://SITE/order/table-07`) |
| **iPad**, landscape, Safari | Kitchen | `https://SITE/staff` |
| **Laptop**, Chrome, full screen | Owner | `https://SITE/owner` |

## The 60-second demo

1. "Imagine you just sat down at Deluj. Scan this." — Hosny scans the card.
2. **Matcha → Iced Matcha → Oat milk → Less ice → Add to order.**
3. "Perfect with this" → **Maple Syrup Pancakes → Add.**
4. **View order → Checkout → Pay EGP 485** (demo card, no charge).
5. Turn the **iPad**: his order is there. Tap **Accept order**, then **Start preparing**. His phone changes.
6. Turn the **laptop**: "Good Morning, Hosny" — revenue **+EGP 485**, his order in **Live at Deluj**.
7. His phone: **Request bill** → iPad shows **TABLE 07 · REQUEST BILL · JUST NOW**. Tap **Done**.
8. iPad: **Mark ready → Mark served**. His phone: **Enjoy!**
9. Laptop: show **Smart Insights**. Switch **Iced Matcha** to **Sold out** → his menu shows Sold out. Switch it back.

## If Wi-Fi fails

1. Turn on your phone's **hotspot** (4G). Join the phone, iPad and laptop to it. Reload each screen. Done.
2. No internet at all → run the **local demo** (below) and use the laptop as the server.
3. Only the laptop works → open three windows side by side on the laptop: `http://localhost:3000/owner`, `/staff`, `/order/table-07`.
4. No local demo either → laptop: **Owner → Settings → Use offline mode**. The three tabs you opened in step 7 above keep working in this one browser.

## How to restart the local demo

Once, the night before (needs internet):

```bash
git clone https://github.com/omarrakram/Deluj.git deluj
cd deluj && npm ci && npm run build
```

On the day (no internet needed):

```bash
cd deluj && npm run demo:start
```

It prints the exact address for each device, like:

- Laptop: `http://localhost:3000/owner`
- iPad: `http://LAPTOP-IP:3000/staff`
- Phone: `http://LAPTOP-IP:3000/order/table-07` (or print a local card from `http://LAPTOP-IP:3000/print/table-07`)

To stop: `Ctrl+C`. To start again: `npm run demo:start`.
