const Priest = require("../models/Priest");
const Parish = require("../models/Parish");
const Congregation = require("../models/Congregation");
const multer = require('multer');
const XLSX = require('xlsx');
const upload = multer({ storage: multer.memoryStorage() });

async function getAllPriests(req, res) {
  try {
    const priests = await Priest.find()
      .populate("homeParish", "name")
      .populate("homeCongregation", "name")
      .select("-__v -homeAddress -currentAddress")
      .lean();
    res.status(200).json(priests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "An error occurred while fetching priest data." });
  }
}
// In priest controller — add this:
async function getPriestList(req, res) {
  try {
    const priests = await Priest.find({ status: "active" }, "name hname").sort({ name: 1 }).lean();
    res.status(200).json(priests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
async function getOnePriest(req, res) {
  try {
    const priest = await Priest.findById(req.params.priestid)
      .populate("homeParish", "name")
      .populate("homeCongregation", "name");
    if (!priest) return res.status(404).json({ message: "Priest not found." });
    res.status(200).json(priest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "An error occurred while fetching priest data." });
  }
}

async function createNewPriest(req, res) {
  try {
    const { name, hname, dob, ordinationDate, homeType, status } = req.body;
    if (!name || !dob || !ordinationDate || !homeType || !status)
      return res.status(400).json({ message: "Required fields are missing." });

    const newPriest = await new Priest(req.body).save();
    res.status(201).json({ message: "Priest created successfully.", priest: newPriest });
  } catch (err) {
    console.error("Error creating Priest:", err);
    res.status(500).json({ message: "An error occurred while creating priest." });
  }
}

// async function updatePriest(req, res) {
//   try {
//     const priest = await Priest.findByIdAndUpdate(req.params.priestid, req.body, { new: true });
//     if (!priest) return res.status(404).json({ message: "Priest not found." });
//     res.status(200).json({ message: "Priest updated successfully." });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "An error occurred while updating priest." });
//   }
// }
async function updatePriest(req, res) {
  try {
    const priest = await Priest.findById(req.params.priestid);
    if (!priest) return res.status(404).json({ message: "Priest not found." });

    // If status changed, push old status to history
    if (req.body.status && req.body.status !== priest.status) {
      priest.statusHistory = priest.statusHistory || [];
      priest.statusHistory.push({
        status: priest.status,
        date: priest.statusDate || priest.updatedAt || new Date(),
        changedAt: new Date(),  // ← ADD THIS: when the change actually happened
        restHome: priest.restHome || "",
        remarks: `Changed from ${priest.status} to ${req.body.status}`,
      });
    }

    Object.assign(priest, req.body);
    await priest.save();
    res.status(200).json({ message: "Priest updated successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "An error occurred while updating priest." });
  }
}
async function deletePriest(req, res) {
  try {
    const priest = await Priest.findByIdAndDelete(req.params.priestid);
    if (!priest) return res.status(404).json({ message: "Priest not found." });
    res.status(200).json({ message: "Priest deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "An error occurred while deleting priest." });
  }
}

const parseDate = (str) => {
  if (!str) return null;
  const trimmed = str.toString().trim();
  
  // Excel serial number (pure digits, possibly with decimals)
  if (/^\d+(\.\d+)?$/.test(trimmed) && trimmed.length <= 7) {
    const serial = parseFloat(trimmed);
    if (serial > 1 && serial < 100000) {
      // Excel epoch: Jan 1, 1900 (with the off-by-one bug)
      const date = new Date(Date.UTC(1899, 11, 30 + serial));
      if (!isNaN(date)) return date;
    }
  }
  
  // DD/MM/YYYY or DD-MM-YYYY
  const parts = trimmed.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    // If first part is 4 digits → YYYY-MM-DD
    if (a.length === 4) return new Date(`${a}-${b}-${c}`);
    // Otherwise DD/MM/YYYY
    return new Date(`${c}-${b}-${a}`);
  }
  
  // Fallback
  const d = new Date(trimmed);
  return isNaN(d) ? null : d;
};
async function bulkUploadPriests(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: false });

    if (!rows.length) return res.status(400).json({ message: 'Empty file' });

    const [allParishes, allCongregations] = await Promise.all([
      Parish.find({}, 'name'),
      Congregation.find({}, 'name')
    ]);
    const parishMap = {};
    allParishes.forEach(p => { parishMap[p.name.trim().toLowerCase()] = p._id; });
    const congMap = {};
    allCongregations.forEach(c => { congMap[c.name.trim().toLowerCase()] = c._id; });

    const created = [];
    const failed = [];

    const col = (row, ...keys) => {
      for (const k of keys) { if (row[k] !== undefined) return (row[k] || '').toString().trim(); }
      return '';
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      try {
        
        const name = col(row, 'Name *', 'name');
        const hname = col(row, 'Malayalam Name *', 'hname');
        // const homeType = col(row, 'Home Type *\n(homeDiocese/otherDiocese/congregation)', 'homeType');
        // const status = col(row, 'Status *\n(active/inactive/retired/died)', 'status') || 'active';
const homeType ='homeDiocese';
const status = col(row, 'status', 'Status') || 'active';
        if (!name || !hname) {
          failed.push({ row: rowNum, name, error: 'Missing required fields' });
          continue;
        }

       const DEFAULT_DATE = new Date('2000-01-01');

const dob =  DEFAULT_DATE;
const ordinationDate = DEFAULT_DATE;

        let homeParish = '6847bab1cd60e31ca2d62202', homeParishText = '', homeCongregation = null;


        if (homeType === 'homeDiocese') {
         
        } else if (homeType === 'otherDiocese') {
          homeParishText = col(row, 'Home Parish Text\n(Free text if otherDiocese)', 'homeParishText');
        } else if (homeType === 'congregation') {
          const cName = col(row, 'Home Congregation\n(Name if congregation)', 'homeCongregation');
          if (cName) {
            homeCongregation = congMap[cName.toLowerCase()] || null;
            if (!homeCongregation) { failed.push({ row: rowNum, name, error: `Congregation "${cName}" not found` }); continue; }
          }
        } else {
          failed.push({ row: rowNum, name, error: `Invalid homeType "${homeType}"` });
          continue;
        }

        if (!['active', 'inactive', 'retired', 'died'].includes(status)) {
          failed.push({ row: rowNum, name, error: `Invalid status "${status}"` });
          continue;
        }

        created.push({
          name, hname, dob, ordinationDate,
          email: col(row, 'Email', 'email'),
          phone: col(row, 'Phone', 'phone'),
          workingRegion: col(row, 'Working Region', 'workingRegion') || 'India',
          workingCountry: col(row, 'Working Country', 'workingCountry'),
          homeAddress: {
            houseName: col(row, 'Home House Name', 'homeHouseName'),
            street: col(row, 'Home Street', 'homeStreet'),
            city: col(row, 'Home City', 'homeCity'),
            district: col(row, 'Home District', 'homeDistrict'),
            state: col(row, 'Home State', 'homeState'),
            pincode: col(row, 'Home Pincode', 'homePincode'),
            country: col(row, 'Home Country', 'homeCountry') || 'India',
          },
          currentAddress: {
            houseName: col(row, 'Current House Name', 'currentHouseName'),
            street: col(row, 'Current Street', 'currentStreet'),
            city: col(row, 'Current City', 'currentCity'),
            district: col(row, 'Current District', 'currentDistrict'),
            state: col(row, 'Current State', 'currentState'),
            pincode: col(row, 'Current Pincode', 'currentPincode'),
            country: col(row, 'Current Country', 'currentCountry') || 'India',
          },
          homeType, homeParish, homeParishText, homeCongregation, status,
          statusDate: parseDate(col(row, 'Status Date\n(DD/MM/YYYY, if retired/died)', 'statusDate')),
          restHome: col(row, 'Rest Home\n(if retired)', 'restHome')
        });
      } catch (err) {
        failed.push({ row: rowNum, name: row['Name *'] || '', error: err.message });
      }
    }

    let inserted = [];
    if (created.length > 0) {
      inserted = await Priest.insertMany(created, { ordered: false });
    }

    res.status(200).json({
      message: `${inserted.length} priests uploaded, ${failed.length} failed`,
      data: { created: inserted.length, failed }
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ message: error.message });
  }
}

module.exports = {
  getAllPriests,getPriestList,getOnePriest, createNewPriest, updatePriest, deletePriest,
  bulkUploadPriests, uploadMiddleware: upload.single('file')
};