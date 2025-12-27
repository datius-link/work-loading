import jwt from "jsonwebtoken";

export const verifyAuth = (req, res, next) => {
  try {
    /* -----------------------------
     * 1. READ AUTH HEADER
     * ----------------------------- */
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Authorization header missing.",
      });
    }

    /* -----------------------------
     * 2. CHECK BEARER FORMAT
     * ----------------------------- */
    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format.",
      });
    }

    const token = parts[1];

    /* -----------------------------
     * 3. VERIFY TOKEN
     * ----------------------------- */
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    /**
     * decoded SHOULD contain at least:
     * {
     *   id,
     *   role,
     *   isVerified (optional)
     * }
     */

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload.",
      });
    }

    /* -----------------------------
     * 4. ATTACH USER TO REQUEST
     * ----------------------------- */
    req.user = {
      id: decoded.id,
      role: decoded.role,
      isVerified: decoded.isVerified ?? false,
    };

    /* -----------------------------
     * 5. CONTINUE
     * ----------------------------- */
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

export const onlyVerifiedProviders = (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({
      message: "Verify your account first",
    });
  }
  next();
};
