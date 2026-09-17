const express = require("express");
const router = express.Router();
const Family = require("../models/Family");
const Person = require("../models/Person");

router.get("/koottayma-wise-family-list", async (req, res) => {
  try {
    const families = await Family.find({})
      .populate("head", "name")
      .populate("koottayma", "name")
      .select("id name koottayma head")
      .sort({ "koottayma.name": 1, "name": 1 });

    const familiesWithCounts = await Promise.all(
      families.map(async (family) => {
        const memberCount = await Person.countDocuments({ family: family.id });
        return {
          familyName: family.name,
          headName: family.head ? family.head.name : "No Head Assigned",
          koottaymaName: family.koottayma ? family.koottayma.name : "Unknown Koottayma",
          memberCount: memberCount 
        };
      })
    );

    
    const groupedFamilies = familiesWithCounts.reduce((acc, family) => {
      const koottaymaName = family.koottaymaName;
      if (!acc[koottaymaName]) acc[koottaymaName] = [];
      acc[koottaymaName].push({
        familyName: family.familyName,
        headName: family.headName,
        memberCount: family.memberCount
      });
      return acc;
    }, {});

    res.json(groupedFamilies);
  } catch (err) {
    console.error("Error fetching family by Koottayma:", err.stack);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
