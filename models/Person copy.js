// const mongoose = require("mongoose");
// const { parse, format, isAfter, parseISO } = require("date-fns");

// function convertToDate(input) {
//   // Handle null or undefined
//   if (input == null) return null;

//   // If already a Date object, return it
//   if (input instanceof Date) return input;

//   // Handle Excel date serial number
//   if (typeof input === 'number') {
//     // Excel date serial number starts from 1900-01-01
//     const excelEpoch = new Date(1900, 0, 1);
//     const millisecondsSinceEpoch = (input - 1) * 24 * 60 * 60 * 1000;
//     return new Date(excelEpoch.getTime() + millisecondsSinceEpoch);
//   }

//   // Handle string inputs
//   if (typeof input === 'string') {
//     // Try parsing with different formats
//     const formats = [
//       'dd/MM/yyyy',   // Standard input format
//       'yyyy-MM-dd',   // ISO format
//       'MM/dd/yyyy',   // US format
//       'dd-MM-yyyy',   // Alternative format
//     ];

//     for (const fmt of formats) {
//       try {
//         const parsedDate = parse(input, fmt, new Date());
//         if (!isNaN(parsedDate.getTime())) {
//           return parsedDate;
//         }
//       } catch (error) {
//         // Continue to next format if parsing fails
//         continue;
//       }
//     }

//     // Try ISO parsing as a last resort
//     try {
//       const isoDate = parseISO(input);
//       if (!isNaN(isoDate.getTime())) {
//         return isoDate;
//       }
//     } catch (error) {
//       // Ignore parsing error
//     }
//   }

//   // If all parsing methods fail, return null
//   return null;
// }

// const personSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: false,
//     },
//     baptismName: {
//       type: String,
//       required: false,
//     },
//     gender: {
//       type: String,
//       required: false,
//       enum: ["male", "female"],
//     },
//     dob: {
//       type: Date,
//       required: false,
//       validate: {
//         validator: function (value) {
//           // Only validate if a date is provided
//           return value ? !isAfter(value, new Date()) : true;
//         },
//         message: "Date of birth cannot be after today.",
//       },
//       set: function (value) {
//         // Convert input to Date object
//         return convertToDate(value);
//       },
//       get: function (value) {
//         // Format date for display
//         return value ? format(value, "dd/MM/yyyy") : null;
//       },
//     },
//     phone: {
//       type: String,
//       // maxlength: 13,
//       // minlength: 10,
//       // unique: false,
//       sparse: true,
//       required: false,
//     },
//     email: {
//       type: String,
//       unique: false,
//       required: false,
//     },
//     education: {
//       type: String,
//       required: false,
//     },
//     occupation: {
//       type: String,
//       required: false,
//     },
//     forane: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Forane",
//       required: true,
//     },
//     parish: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Parish",
//       required: true,
//     },
//     /*koottayma:{
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Koottayma",
//     },*/
//     family: {
//       type: String,
//       required: true,
//       ref: "Family"
//     },
//     relation: {
//       type: String,
//       required: false,
//       enum: [
//         "head",
//         "wife",
//         "husband",
//         "son",
//         "daughter",
//         "father",
//         "mother",
//         "brother",
//         "sister",
//         "son in law",
//         "daughter in law",
//         "grandson",
//         "granddaughter"
//       ],
//     },
//     status: {
//       type: String,
//       required: true,
//       enum: ['active', 'inactive', 'moved_out', 'deceased','rollback'],
//       default: 'active'
//     },
//     narration: {
//       type: String,
//       default: ''
//     },
//     Pname: {
//       type: String,
//       default: ''
//     },
//     pid: {
//       type: Number,
//       default: ''
//     },
//   },
//   {
//     id: false,
//     toJSON: {
//       transform: function (doc, ret, options) {
//         delete ret.id;
//         return ret;
//       },
//       getters: true,
//     },
//     toObject: {
//       transform: function (doc, ret, options) {
//         delete ret.id;
//         return ret;
//       },
//       getters: true,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// personSchema.pre("save", async function (next) {
//   const family = await mongoose.model("Family").findOne({ id: this.family });
//   if (!family) {
//     return next(new Error("Family not found."));
//   }
//   if (this.relation === "head") {
//     const existingHead = await mongoose.model("Person").findOne({
//       family: this.family,
//       relation: "head",
//     });

//     if (existingHead) {
//       return next(new Error("There is already a head in this family."));
//     }
//   } else {
//     const existingHead = await mongoose.model("Person").findOne({
//       family: this.family,
//       relation: "head",
//     });

//     if (!existingHead) {
//       return next(new Error("Please insert the head person first."));
//     }
//   }
//   next();
// });

// personSchema.post("findByIdAndUpdate", async function (doc, next) {
//   if (doc.status === "deceased") {
//     const family = await mongoose.model("Family").findOne({ id: doc.family });
//     if (family.head && family.head.toString() === doc._id.toString()) {
//       family.head = undefined;
//       await family.save();
//     }
//   }
//   next();
// });

// personSchema.post("save", async function (doc, next) {
//   if (doc.relation === "head") {
//     const family = await mongoose.model("Family").findOne({ id: doc.family });
//     if (family) {
//       await mongoose
//         .model("Family")
//         .findOneAndUpdate({ id: doc.family }, { head: doc._id });
//     }
//   }
//   next();
// });
// personSchema.methods.validateAndConvertDate = function(dateInput) {
//   this.dob = convertToDate(dateInput);
//   return this.dob;
// };

// const Person = mongoose.model("Person", personSchema);
// module.exports = Person;
