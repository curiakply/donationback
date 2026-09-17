const ParishData = require('../models/parishdata');

// Controller function for saving parish data
exports.saveParishData = async (req, res) => {
  try {
    const parishData = req.body.parishData;

    // Delete existing parish data
    await ParishData.deleteMany();

    // Save the new parish data to the database
    await ParishData.insertMany(parishData);

    res.status(200).json({ message: 'Parish data saved successfully' });
  } catch (error) {
    console.error('Error saving parish data:', error);
    res.status(500).json({ error: 'An error occurred while saving parish data' });
  }
};