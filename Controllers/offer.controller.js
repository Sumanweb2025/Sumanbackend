const Offer = require('../Models/offer.model');

exports.getActiveOffer = async (req, res) => {
  try {
    const now = new Date();

    const offer = await Offer.findOne({
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    if (!offer) {
      return res.json({ message: "No active offer." });
    }

    return res.json(offer);
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};

exports.createOffer = async (req, res) => {
  try {
    const newOffer = new Offer(req.body);
    await newOffer.save();
    res.status(201).json(newOffer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteOffer = async (req, res) => {
  try {
    await Offer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Offer deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
