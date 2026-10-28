# Bigler Location — Mise en ligne

## Option recommandée : Railway (gratuit pour commencer)

### Étapes simples

1. Va sur **https://railway.app**
2. Crée un compte (avec GitHub ou email)
3. Clique sur **New Project** → **Deploy from GitHub repo**  
   *(ou "Empty Project" puis uploade le dossier)*
4. Si tu n’as pas de GitHub :
   - Crée un compte GitHub (gratuit)
   - Uploade le dossier `bigler-location` dans un nouveau dépôt
   - Puis connecte-le à Railway

5. Une fois le projet importé, Railway détecte automatiquement Node.js

6. Dans les **Variables** de Railway, ajoute ces clés :

| Variable | Valeur |
|----------|--------|
| `STRIPE_SECRET_KEY` | ta clé secrète Stripe (`sk_test_...` ou `sk_live_...`) |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | ton email Gmail |
| `SMTP_PASS` | mot de passe d’application Gmail |
| `FROM_EMAIL` | ton email |
| `ADMIN_EMAIL` | ton email |
| `ADMIN_PASSWORD` | le mot de passe que tu veux pour /admin |
| `PORT` | `3000` *(Railway le met parfois automatiquement)* |

7. Railway te donne une adresse du type :  
   `https://bigler-location-production.up.railway.app`

### Alternative plus simple : Render.com

1. Va sur **https://render.com**
2. New → Web Service
3. Connecte ton repo GitHub ou uploade le projet
4. Build Command : `npm install`
5. Start Command : `npm start`
6. Ajoute les mêmes variables d’environnement

---

## Fichiers à envoyer
Le dossier `bigler-location` (sans le dossier `node_modules`).

## Après la mise en ligne
- Teste le site avec la carte Stripe de test : `4242 4242 4242 4242`
- Va sur `/admin` avec ton mot de passe
- Change les prix dans `server.js` si besoin

## Besoin d’aide ?
Dis-moi à quelle étape tu bloques, je t’aide pas à pas.
