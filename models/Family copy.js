// const mongoose = require("mongoose");

// const familySchema = new mongoose.Schema(
//   {
//     id: {
//       type: Number,
//       required: true,
//       unique: true,
//     },
//     name: {
//       type: String,
//       required: true,
//     },
//     building: {
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
//     koottayma: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Koottayma",
//       required: true,
//     },
//     head: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Person",
//       default: undefined,
//     },
//     phone: {
//       type: String,
//       required: false,
//     },
//     street: {
//       type: String,
//       required: false,
//     },
//     city: {
//       type: String,
//       required: false,
//     },
//     district: {
//       type: String,
//       required: false,
//     },
//     pincode: {
//       type: String,
//       required: false,
//     },
//     status: {
//       type: String,
//       required: true,
//       default: "active",
//     },
//     Narration: {
//       type: String,
//       required: false,
//     },
//     familyNumber: { type: Number, required: true }, 
//      Pname: {
//       type: String,
//       required: false,
//     },
//      verify: {
//       type: String,
//       required: false,
//       default: "NO",
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// // familySchema.methods.updateHead = async function (newHeadId) {
// //   const Person = mongoose.model("Person");
// //   const newHead = await Person.findById(newHeadId);
// //   if (!newHead) {
// //     throw new Error("New head not found");
// //   }
// //   if (newHead.family !== this.id) {
// //     throw new Error("New head does not belong to this family");
// //   }
// //   if (this.head) {
// //     const currentHead = await Person.findById(this.head);
// //     const newRelation = determineRelation(currentHead, newHead);
// //     await Person.findByIdAndUpdate(this.head, { relation: newRelation });
// //   }
// //   await Person.findByIdAndUpdate(newHeadId, { relation: "head" });
// //   this.head = newHeadId;
// //   await this.save();
// //   const members = await Person.find({
// //     family: this.id,
// //     _id: { $ne: newHeadId },
// //   });
// //   for (const member of members) {
// //     const relation = determineRelation(member, newHead);
// //     await Person.findByIdAndUpdate(member._id, { relation });
// //   }
// // };

// function determineRelation(member, newHead) {
//   if (newHead.relation === "wife") {
//     return "husband";
//   } else if (newHead.relation === "husband") {
//     return "wife";
//   } else if (newHead.relation === "son" || newHead.relation === "daughter") {
//     if (member.gender === "male") {
//       return "father";
//     } else {
//       return "mother";
//     }
//   } else if (newHead.relation === "father" || newHead.relation === "mother") {
//     if (member.gender === "male") {
//       return "son";
//     } else {
//       return "daughter";
//     }
//   } else if (newHead.relation === "brother" || newHead.relation === "sister") {
//     if (member.gender === "male") {
//       return "brother";
//     } else {
//       return "sister";
//     }
//   }
// }

// const Family = mongoose.model("Family", familySchema);
// module.exports = Family;
