const options = {
  definition: {
    openapi: "3.1.0",
    info: {
      title: "Tithe API",
      version: "0.1.0",
      description: "Tithe Express API",
      license: {
        name: "ISC",
        url: "https://spdx.org/licenses/ISC.html",
      },
      contact: {
        name: "Department Of computer Science and Engineering , AJCE",
        url: "https://www.ajce.in/cse/index.html",
        email: "hodcse@amaljyothi.ac.in",
      },
    },
    servers: [
      {
        url: "http://localhost:8082",
        description: "Development server",
      },
      {
        url: "https://tithe-backend.onrender.com",
        description: "Production server",
      },
    ],
  },
  apis: ["./routes/*.js"],
};

module.exports = options;
