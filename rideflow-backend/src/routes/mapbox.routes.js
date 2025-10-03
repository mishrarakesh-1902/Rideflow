const express = require('express');
const router = express.Router();
const mapbox = require('../services/mapbox.service');
const auth = require('../middlewares/auth.middleware');

router.get('/suggest', async (req, res) => {
  try {
    const q = req.query.q || req.query.query;
    const proximity = req.query.lng && req.query.lat ? { lng: Number(req.query.lng), lat: Number(req.query.lat) } : undefined;
    const results = await mapbox.suggest(q, proximity);
    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'mapbox failed', error: err.message });
  }
});

router.get('/reverse', async (req, res) => {
  const { lng, lat } = req.query;
  if (!lng || !lat) return res.status(400).json({ message: 'lng,lat required' });
  const r = await mapbox.reverse(Number(lng), Number(lat));
  res.json(r);
});

module.exports = router;
