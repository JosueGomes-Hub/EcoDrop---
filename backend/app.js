const express = require("express");
const path = require("path");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const collectionPointRoutes = require("./routes/collectionPointRoutes");
const walletRoutes = require("./routes/walletRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const partnerRoutes = require("./routes/partnerRoutes");
const missionRoutes = require("./routes/missionRoutes");
const supportRoutes = require("./routes/supportRoutes");
const { notFoundHandler } = require("./middleware/notFound");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();
const frontendPath = path.join(__dirname, "..", "frontend");

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isPrivateIpv4Host(hostname) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return false;
  }

  const octets = hostname.split(".").map(Number);

  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
  );
}

function isDevelopmentOrigin(origin) {
  try {
    const parsedOrigin = new URL(origin);

    if (!["http:", "https:"].includes(parsedOrigin.protocol)) {
      return false;
    }

    return ["localhost", "::1"].includes(parsedOrigin.hostname) || isPrivateIpv4Host(parsedOrigin.hostname);
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin) || isDevelopmentOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
  }),
);

app.use(express.json());

app.use("/frontend", express.static(frontendPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    data: {
      name: "AmazonViva API",
      status: "ok",
      version: "2.0.0",
    },
  });
});

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/collection-points", collectionPointRoutes);
app.use("/wallet", walletRoutes);
app.use("/appointments", appointmentRoutes);
app.use("/deliveries", deliveryRoutes);
app.use("/partners", partnerRoutes);
app.use("/missions", missionRoutes);
app.use("/support", supportRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
