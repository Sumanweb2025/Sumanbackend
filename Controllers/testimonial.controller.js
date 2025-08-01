// import Testimonial from '../Models/testimonial.model';

// // Get all testimonials (with optional pagination)
// const getTestimonials = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = 1;
//     const skip = (page - 1) * limit;

//     const testimonials = await Testimonial.find().skip(skip).limit(limit);
//     const total = await Testimonial.countDocuments();

//     res.status(200).json({
//       testimonials,
//       currentPage: page,
//       totalPages: Math.ceil(total / limit)
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error });
//   }
// };

// // Optionally: Add new testimonials via admin form
// const addTestimonial = async (req, res) => {
//   try {
//     const { name, feedback, location } = req.body;
//     const newTestimonial = new Testimonial({ name, feedback, location });
//     await newTestimonial.save();
//     res.status(201).json({ message: "Testimonial added", newTestimonial });
//   } catch (error) {
//     res.status(400).json({ message: "Error adding testimonial", error });
//   }
// };

// module.exports = {
//     getTestimonials,
//     addTestimonial
// }
