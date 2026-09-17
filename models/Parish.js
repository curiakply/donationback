const mongoose = require("mongoose");

const parishSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    shortCode: {
      type: String,
      required: false,
      unique: true,
      maxlength: 4,
      minlength: 3,
    },
    building: {
      type: String,
      required: false,
    },
    forane: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Forane",
      required: true,
    },
    phone: {
      type: String,
      required: false,
    },
    street: {
      type: String,
    },
    city: {
      type: String,
      required: false,
    },
    district: {
      type: String,
      required: false,
    },
    state: {
      type: String,
      required: false,
    },
    pincode: {
      type: String,
      required: false,
    },
    idold: {
      type: String,
      required: false,
    }
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to generate short code
parishSchema.pre('save', async function(next) {
  // If short code already exists, skip generation
  if (this.shortCode) {
    return next();
  }

  // Generate unique short code
  try {
    this.shortCode = await generateUniqueShortCode(this.name);
    next();
  } catch (error) {
    next(error);
  }
});

// Function to generate unique short code
async function generateUniqueShortCode(name) {
  // Remove spaces and convert to uppercase
  const cleanName = name.replace(/\s+/g, '').toUpperCase();
  
  // Ensure first letter is always included
  const firstLetter = cleanName[0];
  
  // Updated strategies to always start with the first letter
  const strategies = [
    (name) => firstLetter + name.slice(1, 3),  // First letter + next two letters
    (name) => firstLetter + name.slice(2, 4),  // First letter + 3rd and 4th letters
    (name) => firstLetter + name.slice(-2),    // First letter + last two letters
    (name) => firstLetter + name[1] + name.slice(-1)  // First letter + second letter + last letter
  ];

  // Try strategies to generate unique code
  for (const strategy of strategies) {
    const shortCode = strategy(cleanName);
    
    // Check if this short code already exists
    const existingParish = await Parish.findOne({ shortCode });
    
    if (!existingParish) {
      return shortCode;
    }
  }

  // Fallback: use first letter + sequential number
  let counter = 1;
  while (true) {
    const fallbackCode = firstLetter + counter.toString().padStart(3, '0');
    
    // Check if this fallback code exists
    const existingParish = await Parish.findOne({ shortCode: fallbackCode });
    
    if (!existingParish) {
      return fallbackCode;
    }
    
    counter++;
  }
}

// Add a method to generate short code manually if needed
parishSchema.methods.generateShortCode = async function() {
  if (!this.shortCode) {
    this.shortCode = await generateUniqueShortCode(this.name);
    await this.save();
  }
  return this.shortCode;
};

// Create utility method to generate short codes for existing parishes
parishSchema.statics.generateMissingShortCodes = async function() {
  // Find parishes without short codes
  const parishesWithoutCode = await this.find({ shortCode: { $exists: false } });
  
  const updatedParishes = [];
  for (const parish of parishesWithoutCode) {
    parish.shortCode = await generateUniqueShortCode(parish.name);
    await parish.save();
    updatedParishes.push(parish);
  }
  
  return updatedParishes;
};

const Parish = mongoose.model("Parish", parishSchema);

module.exports = Parish;