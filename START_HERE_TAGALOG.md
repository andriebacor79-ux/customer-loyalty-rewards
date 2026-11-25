# Updated project: Activities 3-6

Ito ang version 2 ng Customer Loyalty and Rewards Management System. Backend pa rin ito; Postman ang client. Hindi required ang frontend sa final-project instructions.

## Unang gagawin sa PC

1. I-extract ang ZIP at buksan ang `loyalty-system` folder sa VS Code.
2. Install Node.js 22 LTS o mas bago, MySQL Community Server 8.4, Git at Postman.
3. Gumawa ng BAGONG database na `loyalty_v2`. Huwag gamitin ang lumang v1 database: iba na ang tables. Walang automatic conversion ng lumang data.
4. Sundan ang README.md para gumawa ng local database user.
5. Kopyahin ang `.env.example` bilang `.env`. Ilagay ang sarili mong DB password, MANAGER_EMAIL, MANAGER_PASSWORD at random JWT_SECRET.
6. Sa terminal, patakbuhin:

```sh
npm ci
npm run db:setup
npm run build
npm run start:dev
```

7. I-import sa Postman ang `postman/Loyalty.postman_collection.json`. Set `managerEmail` at `managerPassword` collection variables. Base URL: `http://localhost:3000/api/v1`.
8. Sa Collection Runner, patakbuhin ang 49 requests mula una hanggang dulo. Awtomatikong kinukuha ang Manager, Staff at Customer tokens.

## Ano ang nabago?

Pitong entities na ang base sa Activity 4. May customer login, Staff/Manager roles, sariling-account access, loyalty-account status, Earn/Redeem/Adjust ledger, email queue at low-stock alerts. Confirmed rule: 1 point kada PHP10. Halimbawa: PHP1500 = 150 points.

## Email demo

`npm run mail:preview` ang gagawa ng local text previews. HINDI nito sine-send ang email o minamarkahang Sent. Para makita sa totoong SMTP inbox capture, mag-run ng Mailpit sa PC at sundan ang README. `npm run mail:dispatch` ang magpapadala sa configured SMTP server.

## Bago ipasa

Basahin ang docs/LAB_ALIGNMENT.md at docs/DEMO_SCRIPT.md. Kailangan mo pa rin ang sarili mong GitHub repository na may tunay na meaningful commits, sariling narrated demo video, actual Postman screenshots at presentation slides. Idagdag ang GitHub/video links at screenshots sa Documentation.md, saka i-regenerate ang PDF.
