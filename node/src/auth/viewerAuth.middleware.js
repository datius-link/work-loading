import jwt from "jsonwebtoken";

export function requireViewerAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Viewer token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    const payload = jwt.verify(
      token,
      process.env.AUTH_TOKEN_SECRET
    );

    req.viewer = payload;

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired viewer token",
    });
  }
}

export function optionalViewerAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.viewer = null;
      return next();
    }

    const token = authHeader.split(" ")[1];

    const payload = jwt.verify(
      token,
      process.env.AUTH_TOKEN_SECRET
    );

    req.viewer = payload;
    next();
  } catch (err) {
    // Token invalid, but continue without viewer
    req.viewer = null;
    next();
  }
}