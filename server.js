const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const Stripe = require('stripe');
const nodemailer = require('nodemailer');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'; // Change ce mot de passe !
const AUTH_COOKIE = 'admin_auth';
const AUTH_SECRET = process.env.AUTH_SECRET || 'bigler-secret-key-change-me';

function generateAuthToken() {
  return crypto.createHmac('sha256', AUTH_SECRET).update('authenticated').digest('hex');
}

function isAuthenticated(req) {
  return req.cookies && req.cookies[AUTH_COOKIE] === generateAuthToken();
}

function requireAuth(req, res, next) {
  if (isAuthenticated(req)) return next();
  res.status(401).json({ error: 'Non autorisé' });
}

// Stripe
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51...');

// Email (Nodemailer) — configure tes identifiants SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'ton-email@gmail.com',
    pass: process.env.SMTP_PASS || 'ton-mot-de-passe-app'
  }
});

const FROM_EMAIL = process.env.FROM_EMAIL || process.env.SMTP_USER || 'info@biglerlocation.ch';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || FROM_EMAIL;

async function sendConfirmationEmail(booking) {
  const optionsText = [
    booking.options.insurance ? 'Assurance tous risques' : null,
    booking.options.delivery ? 'Livraison à domicile' : null
  ].filter(Boolean).join(', ') || 'Aucune';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #111; color: #fff; padding: 20px; border-radius: 12px;">
      <h1 style="color: #c41e3a;">Bigler Location</h1>
      <h2>Confirmation de réservation</h2>
      <p>Bonjour ${booking.name},</p>
      <p>Votre réservation a bien été enregistrée et payée.</p>
      <table style="width:100%; margin: 20px 0; border-collapse: collapse;">
        <tr><td style="padding:8px; border-bottom:1px solid #333;"><strong>Véhicule</strong></td><td style="padding:8px; border-bottom:1px solid #333;">${booking.carName}</td></tr>
        <tr><td style="padding:8px; border-bottom:1px solid #333;"><strong>Dates</strong></td><td style="padding:8px; border-bottom:1px solid #333;">${booking.start} → ${booking.end}</td></tr>
        <tr><td style="padding:8px; border-bottom:1px solid #333;"><strong>Prix total</strong></td><td style="padding:8px; border-bottom:1px solid #333;">${booking.price} CHF</td></tr>
        <tr><td style="padding:8px; border-bottom:1px solid #333;"><strong>Options</strong></td><td style="padding:8px; border-bottom:1px solid #333;">${optionsText}</td></tr>
        <tr><td style="padding:8px;"><strong>Statut</strong></td><td style="padding:8px;">${booking.status}</td></tr>
      </table>
      <p>Nous vous contacterons prochainement pour organiser la remise des clés.</p>
      <p>Merci de votre confiance !<br><strong>Bigler Location</strong><br>Genève • Lausanne • Vaud</p>
    </div>
  `;

  try {
    // Email client
    await transporter.sendMail({
      from: `"Bigler Location" <${FROM_EMAIL}>`,
      to: booking.email,
      subject: `Confirmation de réservation — ${booking.carName}`,
      html
    });

    // Email admin (copie)
    await transporter.sendMail({
      from: `"Bigler Location" <${FROM_EMAIL}>`,
      to: ADMIN_EMAIL,
      subject: `Nouvelle réservation — ${booking.carName} (${booking.name})`,
      html: `<p>Nouvelle réservation payée :</p>${html}`
    });

    console.log('Emails de confirmation envoyés à', booking.email);
  } catch (err) {
    console.error('Erreur envoi email :', err.message);
  }
}

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Cars data
const cars = [
  { id: 'my-lr', name: 'Tesla Model Y Long Range', price: 139, image: '/images/model-y-dusk.jpg', specs: '5 places • AWD • Autonomie ~500 km • Coffre spacieux', color: 'Gris' },
  { id: 'm3-lr', name: 'Tesla Model 3 Long Range', price: 109, image: '/images/model-3-forest.jpg', specs: '5 places • AWD • Autonomie ~500 km • Sportive', color: 'Noir' },
  { id: 'ms-plaid', name: 'Tesla Model S Plaid', price: 199, image: '/images/model-s-red.jpg', specs: '5 places • Performance • Autonomie ~600 km', color: 'Rouge' },
  { id: 'my-black', name: 'Tesla Model Y Performance', price: 159, image: '/images/model-y-black-studio.jpg', specs: '5 places • Performance • AWD • Autonomie ~450 km', color: 'Noir' }
];

function loadBookings() {
  try {
    if (fs.existsSync(BOOKINGS_FILE)) {
      return JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading bookings', e);
  }
  return [];
}

function saveBookings(bookings) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
}

function isAvailable(carId, start, end, excludeId = null) {
  const bookings = loadBookings();
  const s = new Date(start);
  const e = new Date(end);
  return !bookings.some(b => {
    if (b.carId !== carId || b.id === excludeId || b.status === 'annulée') return false;
    const bs = new Date(b.start);
    const be = new Date(b.end);
    return !(e <= bs || s >= be);
  });
}

function getDays(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

function calculatePrice(car, days, options = {}) {
  let price = days * car.price;
  if (options.insurance) price += days * 25;
  if (options.delivery) price += 80;
  return price;
}

// API Routes
app.get('/api/cars', (req, res) => {
  res.json(cars);
});

app.get('/api/availability', (req, res) => {
  const { carId, start, end } = req.query;
  if (!carId || !start || !end) return res.status(400).json({ error: 'Paramètres manquants' });
  const available = isAvailable(carId, start, end);
  const car = cars.find(c => c.id === carId);
  const days = getDays(start, end);
  const price = car ? calculatePrice(car, days) : 0;
  res.json({ available, price, days, car });
});

// Créer une session Stripe Checkout
app.post('/api/create-checkout-session', async (req, res) => {
  const { carId, start, end, name, email, phone, options } = req.body;
  if (!carId || !start || !end || !name || !email || !phone) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }
  if (!isAvailable(carId, start, end)) {
    return res.status(409).json({ error: 'Véhicule non disponible pour ces dates' });
  }
  const car = cars.find(c => c.id === carId);
  if (!car) return res.status(404).json({ error: 'Véhicule introuvable' });

  const days = getDays(start, end);
  const price = calculatePrice(car, days, options);
  const amount = Math.round(price * 100); // en centimes

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'chf',
          product_data: {
            name: `${car.name} — ${days} jour(s)`,
            description: `Du ${start} au ${end}${options.insurance ? ' + Assurance' : ''}${options.delivery ? ' + Livraison' : ''}`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      metadata: {
        carId,
        carName: car.name,
        start,
        end,
        name,
        email,
        phone,
        price: price.toString(),
        options: JSON.stringify(options || {}),
      },
      success_url: `${req.protocol}://${req.get('host')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/cancel`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur Stripe : ' + err.message });
  }
});

// Finaliser la réservation après paiement réussi
app.post('/api/confirm-booking', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Session ID manquant' });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Paiement non confirmé' });
    }

    const meta = session.metadata;
    const existing = loadBookings().find(b => b.sessionId === sessionId);
    if (existing) return res.json(existing);

    if (!isAvailable(meta.carId, meta.start, meta.end)) {
      return res.status(409).json({ error: 'Véhicule plus disponible (conflit)' });
    }

    const booking = {
      id: Date.now().toString(),
      sessionId,
      carId: meta.carId,
      carName: meta.carName,
      start: meta.start,
      end: meta.end,
      name: meta.name,
      email: meta.email,
      phone: meta.phone,
      price: parseFloat(meta.price),
      options: JSON.parse(meta.options || '{}'),
      createdAt: new Date().toISOString(),
      status: 'payée',
      paymentIntent: session.payment_intent
    };

    const bookings = loadBookings();
    bookings.push(booking);
    saveBookings(bookings);

    // Envoi de l'email de confirmation (ne bloque pas la réponse)
    sendConfirmationEmail(booking).catch(console.error);

    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bookings', requireAuth, (req, res) => {
  const bookings = loadBookings();
  res.json(bookings);
});

app.delete('/api/bookings/:id', requireAuth, (req, res) => {
  const bookings = loadBookings();
  const idx = bookings.findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Réservation introuvable' });
  bookings[idx].status = 'annulée';
  saveBookings(bookings);
  res.json({ success: true });
});

// Admin login
app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const token = generateAuthToken();
    res.cookie(AUTH_COOKIE, token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000, sameSite: 'lax' });
    return res.json({ success: true });
  }
  res.status(401).json({ error: 'Mot de passe incorrect' });
});

app.post('/admin/logout', (req, res) => {
  res.clearCookie(AUTH_COOKIE);
  res.json({ success: true });
});

app.get('/admin/check', (req, res) => {
  res.json({ authenticated: isAuthenticated(req) });
});

// Pages
app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});
app.get('/cancel', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cancel.html'));
});
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Bigler Location running on http://localhost:${PORT}`);
  console.log('Admin: http://localhost:${PORT}/admin');
});
