# Bigler Location - Site de location Tesla

Site web complet avec frontend, backend Node.js, **paiement Stripe** et **emails de confirmation**.

## Fonctionnalités
- Flotte de Tesla avec photos
- Réservation en ligne avec anti-doublons
- Calcul de prix (jours + options)
- Paiement sécurisé via Stripe Checkout
- **Email de confirmation** au client + copie admin
- Page admin pour gérer les réservations
- Pages succès / annulation

## Installation

1. Node.js 18+
2. Décompresse et :
   ```bash
   cd bigler-location
   npm install
   ```
## Configuration
```bash
# Stripe
export STRIPE_SECRET_KEY=sk_test_...

# Email
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USER=ton-email@gmail.com
export SMTP_PASS=mot-de-passe-application
export FROM_EMAIL=ton-email@gmail.com
export ADMIN_EMAIL=ton-email@gmail.com

# Admin (mot de passe de la page /admin)
export ADMIN_PASSWORD=ton-mot-de-passe-secret
```

Par défaut le mot de passe admin est `admin123` (à changer absolument).


4. Lance :
   ```bash
   npm start
   ```

5. Ouvre :
   - Site : http://localhost:3000
   - Admin : http://localhost:3000/admin

## Configuration email
- **Gmail** : active la validation en 2 étapes, puis crée un "mot de passe d'application".
- Autres services : SendGrid, Mailgun, Brevo, etc. (change `SMTP_HOST` et les identifiants).

## Stripe
- Carte de test : `4242 4242 4242 4242`
- Après paiement réussi → réservation créée + emails envoyés.

## Déploiement
Railway, Render, Fly.io ou VPS. Ajoute toutes les variables d'environnement.
